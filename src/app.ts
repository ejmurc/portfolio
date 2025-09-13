import "./styles.css";
import { Octokit } from "octokit";

interface PinnedRepos {
	user: {
		pinnedItems: {
			nodes: {
				name: string;
				description: string | null;
				url: string;
				stargazerCount: number;
				primaryLanguage: { name: string } | null;
			}[];
		};
	};
}

const query = `
        {
          user(login: "ejmurc") {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                  description
                  url
                  stargazerCount
                  primaryLanguage {
                    name
                  }
                }
              }
            }
          }
        }`;

const octokit = new Octokit({
	auth: "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",
});

const loadProjects = async () => {
  const projectsElement = document.getElementById('projects')!;
	const res = await octokit.graphql<PinnedRepos>(query);
	const projects = res?.user?.pinnedItems?.nodes;
	if (!projects) {
		return;
	}
	const ul = document.createElement("ul");
	for (let i = 0; i < projects.length; i++) {
		const { name, description, url, stargazerCount, primaryLanguage } = projects[i]!;
		const li = document.createElement("li");
		const title = document.createElement("div");
		title.innerText = name;
    const p = document.createElement("div");
    p.innerText = description ?? '';
    const a = document.createElement("a");
    a.href = url; 
    a.innerText = url;
    const info = document.createElement("div");
    info.innerText = `${stargazerCount} star${stargazerCount == 1 ? '' : 's'}, ${primaryLanguage?.name}`;
		li.appendChild(title);
    li.appendChild(p);
    li.appendChild(a);
    li.appendChild(info);
		ul.appendChild(li);
	}
  projectsElement.childNodes[0]?.remove();
  projectsElement.appendChild(ul);
};

document.querySelectorAll('a').forEach((a) => a.onclick = (e) => {e.preventDefault();a.remove();});

window.addEventListener('load', loadProjects);
