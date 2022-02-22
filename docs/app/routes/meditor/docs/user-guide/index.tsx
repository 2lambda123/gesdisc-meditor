import type { LinksFunction, MetaFunction } from 'remix'
import {
    links as tableOfContentsLinks,
    TableOfContents,
} from '~/components/table-of-contents'
import Introduction from '~/documentation/user-guide/introduction.mdx'
import QuickStart from '~/documentation/user-guide/quick-start.mdx'
import UsingComments from '~/documentation/user-guide/using-comments.mdx'
import VersionsAndHistory from '~/documentation/user-guide/versions-and-history.mdx'
import WorkflowsAndRoles from '~/documentation/user-guide/workflows-and-roles.mdx'
import WorkingWithDocuments from '~/documentation/user-guide/working-with-documents.mdx'
import styles from '~/styles/user-guide.css'

export const meta: MetaFunction = () => {
    return { title: 'User Guide | mEditor' }
}

export const links: LinksFunction = () => {
    return [...tableOfContentsLinks(), { rel: 'stylesheet', href: styles }]
}

export default function UserGuide() {
    return (
        <>
            <Introduction />
            <TableOfContents includeHeadings={['h2', 'h3']}>
                <article className="user-guide__article">
                    <QuickStart />
                </article>
                <article className="user-guide__article">
                    <WorkingWithDocuments />
                </article>
                <article className="user-guide__article">
                    <WorkflowsAndRoles />
                </article>
                <article className="user-guide__article">
                    <UsingComments />
                </article>
                <article className="user-guide__article">
                    <VersionsAndHistory />
                </article>
            </TableOfContents>
        </>
    )
}