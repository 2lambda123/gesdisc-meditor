import type { ErrorData } from '../declarations'
import { getModel } from '../models/service'
import type { Workflow, WorkflowEdge } from './types'
import { InternalServerErrorException, NotFoundException } from '../utils/errors'
import { getWorkflowsDb } from './db'

export async function getWorkflowForModel(
    modelName: string
): Promise<ErrorData<Workflow>> {
    try {
        const [modelError, model] = await getModel(modelName)

        if (modelError) {
            return [modelError, null]
        }

        return getWorkflow(model.workflow)
    } catch (error) {
        return [error, null]
    }
}

export async function getWorkflow(
    workflowName: string
): Promise<ErrorData<Workflow>> {
    try {
        const workflowsDb = await getWorkflowsDb()
        const workflow = await workflowsDb.getWorkflow(workflowName)

        if (!workflow) {
            throw new NotFoundException(
                `The requested workflow, ${workflowName}, was not found.`
            )
        }

        return [null, workflow]
    } catch (error) {
        return [error, null]
    }
}

/**
 * the workflow contains a list of edges between states.
 *
 * For states of "Draft", "Under Review", and "Published", the edges could be:
 *  - "Submit for Review"
 *  - "Publish to PROD"
 *
 * Given the above example, calling `getWorkflowEdgeMatchingSourceAndTarget(workflow, "Draft", "Under Review") would return the "Submit For Review" edge
 */
export function getWorkflowEdgeMatchingSourceAndTarget(
    workflow: Workflow,
    source: string,
    target: string
): WorkflowEdge | undefined {
    // find any matching edges
    const matchingEdges = workflow.edges.filter(
        edge => edge.source === source && edge.target === target
    )

    //! if we find more than one edge, the workflow is misconfigured, this is a FATAL error and we should immediately throw
    if (matchingEdges.length > 1) {
        throw new InternalServerErrorException(
            `The workflow, ${workflow.name}, is misconfigured due to having duplicate edges for [source=${source}, target=${target}].`
        )
    }

    return matchingEdges[0]
}

/**
 * the workflow contains a list of nodes the document can be in
 * given a document's current state (or the current node they are on) the document can transition to a subset of those workflow nodes
 *
 * example:
 * given a simple workflow: Draft -> Under Review -> Approved -> Published
 * if a document is in state "Under Review", targetStates would be ["Approved"]
 */
export function getTargetStatesFromWorkflow(
    documentState: string,
    workflow: Workflow
) {
    return workflow.edges
        .filter(edge => edge.source == documentState)
        .map(edge => edge.target)
}
