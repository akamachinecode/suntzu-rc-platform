/** The docs portal's name and where its sources live. Also read by scripts/content.ts. */
export const SITE = {
  name: "SunTzu RC docs",
  description:
    "How SunTzu RC works, how it's run and how to take part: the free calendar, map and community of RC in Florida.",
  website: "https://www.suntzurc.com",
  repository: "https://github.com/akamachinecode/suntzu-rc-platform",
  branch: "main",
} as const;

/** A file or folder of the repository on GitHub. */
export function githubUrl(repoPath: string, kind: "blob" | "tree" = "blob"): string {
  return `${SITE.repository}/${kind}/${SITE.branch}/${repoPath}`;
}
