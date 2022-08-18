import getDb from '../lib/mongodb'
import { BadRequestException, NotFoundException } from '../utils/errors'
import type { Model } from './types'
import jsonpath from 'jsonpath'

export const MODELS_COLLECTION = 'Models'
export const MODELS_TITLE_PROPERTY = 'name'

type getModelOptions = {
    populateMacroTemplates?: boolean
    includeId?: boolean
}

/**
 * retrieves a model, optionally including macro templates
 *
 * Macro templates are a way to populate a model's schema at runtime with values from a different model
 *
 * For example, a model of "News" would have a field called "tags", tags is an enum.
 *
 * Instead of hardcoding tags in the "News" model, we set it to "enum": ["placeholder"] and replace that
 * with a list of all "Tags" model titles at runtime, so it becomes "enum": ["science", "space", ...]
 */
export async function getModel(
    modelName: string,
    options: getModelOptions = { includeId: true }
): Promise<Model> {
    if (!modelName) {
        throw new BadRequestException('Model name is required')
    }

    const db = await getDb()

    let query = db
        .collection(MODELS_COLLECTION)
        .find({ [MODELS_TITLE_PROPERTY]: modelName })
        .sort({ 'x-meditor.modifiedOn': -1 })

    // remove the id, if requested
    if (!options.includeId) {
        query = query.project({ _id: 0 })
    }

    let results = await query.toArray()

    if (!results.length) {
        throw new NotFoundException(`Model not found: ${modelName}`)
    }

    let model = results[0] as Model

    // see top level documentation for description of macro templates
    if (options.populateMacroTemplates) {
        // validate the model's schema before continuing
        if (!this.isJson(model.schema)) {
            throw new BadRequestException(
                `The schema for model, ${modelName}, contains invalid JSON`
            )
        }

        // execute the macro templates for this model and get their values
        // TODO: add support for macros
        //let populatedTemplates = await this.getPopulatedModelTemplates(model)
        let populatedTemplates = []

        // parse the schema into an object
        let schema =
            typeof model.schema === 'string' ? JSON.parse(model.schema) : model.schema

        // can also set macro templates for the layout, parse it's JSON as well if this model has a layout
        let layout = null

        if (model.layout && this.isJson(model.layout)) {
            layout =
                typeof model.layout === 'string'
                    ? JSON.parse(model.layout)
                    : model.layout
        }

        // loop through each macro template and update any matching fields in the model
        populatedTemplates.forEach(template => {
            // update any jsonpath matches in the schema with the template values
            jsonpath.value(schema, template.jsonpath, template.result)

            // if model has a layout, check in the layout for any matching jsonpath to update
            if (layout && jsonpath.paths(layout, template.jsonpath).length) {
                jsonpath.value(layout, template.jsonpath, template.result)
            }
        })

        // set the schema and layout back to JSON strings
        model.schema = JSON.stringify(schema, null, 2)

        if (layout) {
            model.layout = JSON.stringify(layout, null, 2)
        }
    }

    return model
}

export async function getModels(): Promise<Model[]> {
    const db = await getDb()

    // get a list of all models
    return (await db
        .collection(MODELS_COLLECTION)
        .aggregate(
            [
                { $sort: { 'x-meditor.modifiedOn': -1 } }, // Sort descending by version (date)
                { $group: { _id: '$name', doc: { $first: '$$ROOT' } } }, // Grab all fields in the most recent version
                { $replaceRoot: { newRoot: '$doc' } }, // Put all fields of the most recent doc back into root of the document
            ],
            { allowDiskUse: true }
        )
        .toArray()) as Model[]
}

export async function getModelsWithDocumentCount(): Promise<Model[]> {
    const db = await getDb()
    const models = await getModels()

    // get a count of documents in each model
    return await Promise.all(
        models.map(async model => {
            const countResult = await db
                .collection(model.name)
                .aggregate(
                    [
                        { $group: { _id: '$' + model.titleProperty } },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                    { allowDiskUse: true }
                )
                .toArray()

            return {
                ...model,
                'x-meditor': {
                    ...model['x-meditor'],
                    countAll: countResult[0]?.count || 0,

                    // this was originally a role-based count, but any role can see any document so it's always the same as countAll
                    // was able to greatly improve performance by just reusing the full count
                    count: countResult[0]?.count || 0,
                },
            } as Model
        })
    )
}