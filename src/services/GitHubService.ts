export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubFile[];
  truncated: boolean;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export class GitHubService {
  private static readonly BASE_URL = 'https://api.github.com';
  private static apiKey: string | null = null;

  static setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('github_api_key', key);
  }

  static getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('github_api_key');
    }
    return this.apiKey;
  }

  static parseRepoUrl(url: string): RepoInfo | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          branch: match[3] || 'main'
        };
      }
    }
    return null;
  }

  static async fetchRepoTree(owner: string, repo: string, branch: string = 'main'): Promise<GitHubTree> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['Authorization'] = `token ${apiKey}`;
    }

    const url = `${this.BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async fetchFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['Authorization'] = `token ${apiKey}`;
    }

    const url = `${this.BASE_URL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.content && data.encoding === 'base64') {
      return atob(data.content.replace(/\n/g, ''));
    }
    
    return data.content || '';
  }

  static isTextFile(filename: string): boolean {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml',
      '.html', '.htm', '.css', '.scss', '.sass', '.less', '.xml', '.svg',
      '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb',
      '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh',
      '.sql', '.r', '.matlab', '.m', '.pl', '.lua', '.dart', '.vue',
      '.toml', '.ini', '.cfg', '.conf', '.env', '.gitignore', '.dockerignore',
      'Dockerfile', 'README', 'LICENSE', 'CHANGELOG'
    ];

    const lowerName = filename.toLowerCase();
    return textExtensions.some(ext => 
      lowerName.endsWith(ext) || 
      lowerName === ext.slice(1) ||
      (ext.startsWith('.') && lowerName.includes(ext))
    );
  }

  static shouldIncludeFile(path: string): boolean {
    const excludePatterns = [
      /node_modules/,
      /\.git/,
      /\.DS_Store/,
      /\.vscode/,
      /\.idea/,
      /dist/,
      /build/,
      /out/,
      /target/,
      /bin/,
      /obj/,
      /\.next/,
      /coverage/,
      /\.nyc_output/,
      /logs?/,
      /\.log$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /bun\.lockb$/
    ];

    return !excludePatterns.some(pattern => pattern.test(path));
  }
}