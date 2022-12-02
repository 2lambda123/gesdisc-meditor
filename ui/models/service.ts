import jsonpath from 'jsonpath'
import type { ErrorData } from '../declarations'
import { getDocumentsDb } from '../documents/db'
import { ErrorCode, HttpException } from '../utils/errors'
import { getWorkflowByDocumentState } from '../workflows/service'
import { getModelsDb } from './db'
import type { Model, ModelWithWorkflow } from './types'

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
): Promise<ErrorData<Model>> {
    try {
        if (!modelName) {
            throw new HttpException(ErrorCode.BadRequest, 'Model name is required')
        }

        const modelsDb = await getModelsDb()
        const model = await modelsDb.getModel(modelName)

        if (!model) {
            throw new HttpException(
                ErrorCode.NotFound,
                `Model not found: ${modelName}`
            )
        }

        // see top level documentation for description of macro templates
        if (options.populateMacroTemplates) {
            // validate the model's schema before continuing
            if (!this.isJson(model.schema)) {
                throw new HttpException(
                    ErrorCode.BadRequest,
                    `The schema for model, ${modelName}, contains invalid JSON`
                )
            }

            // execute the macro templates for this model and get their values
            // TODO: add support for macros
            //let populatedTemplates = await this.getPopulatedModelTemplates(model)
            let populatedTemplates = []

            // parse the schema into an object
            let schema =
                typeof model.schema === 'string'
                    ? JSON.parse(model.schema)
                    : model.schema

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

        if (!options.includeId) {
            // drop the _id
            const { _id, ...modelWithoutId } = model
            return [null, modelWithoutId]
        }

        return [null, model]
    } catch (err) {
        return [err, null]
    }
}

/**
 * allows you to retrieve the model, workflow, and current node/edges at once
 *
 * retrieving all of these is a frequent need throughout the application. We can avoid errors by moving the logic for
 * retrieval and error handling into a service method
 */
export async function getModelWithWorkflow(
    modelName: string,
    documentState?: string
): Promise<ErrorData<ModelWithWorkflow>> {
    try {
        const [modelError, model] = await getModel(modelName)

        if (modelError) {
            throw modelError
        }

        const [workflowError, workflow] = await getWorkflowByDocumentState(
            model.workflow,
            documentState
        )

        if (workflowError) {
            throw workflowError
        }

        return [
            null,
            {
                ...model,
                workflow,
            },
        ]
    } catch (err) {
        return [err, null]
    }
}

export async function getModels(): Promise<ErrorData<Model[]>> {
    try {
        const modelsDb = await getModelsDb()
        const models = await modelsDb.getModels()

        return [null, models]
    } catch (err) {
        return [err, null]
    }
}

export async function getModelsWithDocumentCount(): Promise<ErrorData<Model[]>> {
    try {
        const [modelsError, models] = await getModels()

        if (modelsError) {
            throw modelsError
        }

        const documentsDb = await getDocumentsDb()

        // get a count of documents in each model
        const modelsWithDocumentCount = await Promise.all(
            models.map(async model => {
                const documentCount =
                    await documentsDb.getNumberOfUniqueDocumentsForModel(
                        model.name,
                        model.titleProperty
                    )

                return {
                    ...model,
                    'x-meditor': {
                        ...model['x-meditor'],
                        countAll: documentCount,

                        // this was originally a role-based count, but any role can see any document so it's always the same as countAll
                        // was able to greatly improve performance by just reusing the full count
                        count: documentCount,
                    },
                } as Model
            })
        )

        return [null, modelsWithDocumentCount]
    } catch (err) {
        return [err, null]
    }
}