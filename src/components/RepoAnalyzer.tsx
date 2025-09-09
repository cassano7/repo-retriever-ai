import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { GitHubService, GitHubFile } from '@/services/GitHubService';
import { FileTreeSelector } from './FileTreeSelector';
import { Download, Github, Key, Loader2 } from 'lucide-react';

export const RepoAnalyzer = () => {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [apiKey, setApiKey] = useState(GitHubService.getApiKey() || '');
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [repoInfo, setRepoInfo] = useState<any>(null);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    GitHubService.setApiKey(value);
  };

  const fetchRepository = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a repository URL",
        variant: "destructive"
      });
      return;
    }

    const parsedRepo = GitHubService.parseRepoUrl(repoUrl);
    if (!parsedRepo) {
      toast({
        title: "Error", 
        description: "Invalid repository URL format",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress(10);
    
    try {
      const tree = await GitHubService.fetchRepoTree(parsedRepo.owner, parsedRepo.repo, parsedRepo.branch);
      setProgress(50);

      const textFiles = tree.tree.filter(file => 
        file.type === 'file' && 
        GitHubService.isTextFile(file.name) &&
        GitHubService.shouldIncludeFile(file.path)
      );

      setFiles(textFiles);
      setRepoInfo(parsedRepo);
      setSelectedFiles(new Set(textFiles.map(f => f.path)));
      setProgress(100);
      
      toast({
        title: "Success",
        description: `Found ${textFiles.length} text files`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const generateOutput = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    
    try {
      const selectedFilesList = files.filter(f => selectedFiles.has(f.path));
      const totalFiles = selectedFilesList.length;
      let processedFiles = 0;

      let output = `# ${repoInfo.owner}/${repoInfo.repo}\n\n`;
      output += `Repository: https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`;
      output += `Branch: ${repoInfo.branch}\n`;
      output += `Generated: ${new Date().toISOString()}\n`;
      output += `Files included: ${totalFiles}\n\n`;
      output += `---\n\n`;

      for (const file of selectedFilesList) {
        try {
          const content = await GitHubService.fetchFileContent(repoInfo.owner, repoInfo.repo, file.path, repoInfo.branch);
          
          output += `## File: ${file.path}\n\n`;
          output += `\`\`\`${getFileExtension(file.name)}\n`;
          output += content;
          output += `\n\`\`\`\n\n`;
          
          processedFiles++;
          setProgress((processedFiles / totalFiles) * 100);
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching ${file.path}:`, error);
          output += `## File: ${file.path}\n\n`;
          output += `Error fetching file content: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
          processedFiles++;
          setProgress((processedFiles / totalFiles) * 100);
        }
      }

      setResult(output);
      toast({
        title: "Success",
        description: `Generated text from ${processedFiles} files`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to generate output: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const getFileExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx', 
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'md': 'markdown'
    };
    return ext ? extMap[ext] || ext : '';
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoInfo.owner}-${repoInfo.repo}-${repoInfo.branch}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Github className="h-8 w-8" />
          Repo Retriever AI
        </h1>
        <p className="text-muted-foreground">
          Convert GitHub repositories into LLM-friendly text format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            GitHub API Key (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key (for private repos or higher rate limits)
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Get your API key from GitHub Settings → Developer settings → Personal access tokens
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repository URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://github.com/owner/repo or owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRepository()}
            />
            <Button onClick={fetchRepository} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
            </Button>
          </div>
          
          {loading && (
            <Progress value={progress} className="w-full" />
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Files ({selectedFiles.size} selected)</CardTitle>
          </CardHeader>
          <CardContent>
            <FileTreeSelector
              files={files}
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
            />
            <div className="mt-4">
              <Button onClick={generateOutput} disabled={loading || selectedFiles.size === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate LLM Text
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Output
              <Button variant="outline" onClick={downloadResult}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={result}
              readOnly
              className="min-h-[300px] font-mono text-xs"
              placeholder="Generated output will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};