
import React, { useState, useCallback, useMemo } from 'react';
import { ProjectFile } from './types';
import { DEFAULT_EXCLUSIONS } from './constants';
import { generateTxtBlob } from './services/txtService';
import { FolderIcon, FileIcon, LoadingSpinnerIcon, DocumentTextIcon } from './components/Icons';

const App: React.FC = () => {
    const [files, setFiles] = useState<FileList | null>(null);
    const [customExclusions, setCustomExclusions] = useState<string>('dist\nbuild\n*.log\n.env');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Select a project folder to begin.');
    const [txtUrl, setTxtUrl] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFiles(event.target.files);
            const firstFile = event.target.files[0];
            const rootDir = firstFile.webkitRelativePath.split('/')[0];
            setProjectName(rootDir);
            setStatus(`${event.target.files.length} files detected in '${rootDir}'. Ready to package.`);
            setTxtUrl(null);
        }
    };

    const exclusionPatterns = useMemo(() => {
        const custom = customExclusions.split('\n').map(s => s.trim()).filter(Boolean);
        return [...DEFAULT_EXCLUSIONS, ...custom];
    }, [customExclusions]);

    const filteredFiles = useMemo(() => {
        if (!files) return [];
        
        return Array.from(files).filter(file => {
            const path = file.webkitRelativePath;
            return !exclusionPatterns.some(pattern => {
                if (pattern.startsWith('*.')) {
                    return path.endsWith(pattern.substring(1));
                }
                if (pattern.endsWith('/')) {
                     return path.includes(`/${pattern.slice(0, -1)}/`) || path.startsWith(pattern.slice(0, -1) + '/');
                }
                 if (path.includes(`/${pattern}/`)) {
                    return true;
                }
                return path.split('/').includes(pattern);
            });
        });
    }, [files, exclusionPatterns]);
    
    const readAndSortFiles = useCallback(async (): Promise<ProjectFile[] | null> => {
        if (!files || filteredFiles.length === 0) {
            setStatus('No files to process.');
            return null;
        }

        setIsLoading(true);
        setStatus('Processing files...');
        setTxtUrl(null);

        try {
            const fileContents: ProjectFile[] = await Promise.all(
                filteredFiles.map(file => {
                    return new Promise<ProjectFile>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve({
                                path: file.webkitRelativePath,
                                content: reader.result as string
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
                })
            );
            
            const sortedFiles = fileContents.sort((a, b) => a.path.localeCompare(b.path));
            return sortedFiles;

        } catch (error) {
            console.error('Error reading files:', error);
            setStatus('An error occurred while reading files.');
            setIsLoading(false);
            return null;
        }
    }, [files, filteredFiles]);


    const processAndGenerateTxt = async () => {
        const sortedFiles = await readAndSortFiles();
        if (!sortedFiles) {
            if (!files || filteredFiles.length === 0) setIsLoading(false);
            return;
        }

        try {
            setStatus(`Read ${sortedFiles.length} files. Generating TXT...`);
            const blob = generateTxtBlob(sortedFiles, projectName);
            const url = URL.createObjectURL(blob);
            setTxtUrl(url);
            setStatus(`TXT for '${projectName}' created successfully!`);
        } catch (error) {
            console.error('Error generating TXT:', error);
            setStatus('An error occurred during TXT generation.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 flex flex-col items-center p-4 sm:p-8 font-sans">
            <div className="w-full max-w-5xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">Code to TXT Packager</h1>
                    <p className="text-slate-400 mt-2">Package your entire source code directory into a single text file.</p>
                </header>

                <main className="bg-slate-800/50 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Input and Settings */}
                        <div className="flex flex-col space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-cyan-300 mb-3">1. Select Project Folder</h2>
                                <label htmlFor="file-upload" className="relative cursor-pointer group flex flex-col items-center justify-center w-full h-40 bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg hover:border-cyan-400 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FolderIcon className="w-12 h-12 mb-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                        <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-slate-500">Select the root directory of your project</p>
                                    </div>
                                    <input id="file-upload" type="file" className="hidden" {...{ webkitdirectory: "", directory: "", multiple: true }} onChange={handleFileChange} />
                                </label>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-cyan-300 mb-3">2. Exclusion Rules</h2>
                                <textarea
                                    className="w-full h-36 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder-slate-500 text-sm font-mono"
                                    value={customExclusions}
                                    onChange={e => setCustomExclusions(e.target.value)}
                                    placeholder="Add files/folders to exclude, one per line. e.g., build/, *.log, .env"
                                />
                                <p className="text-xs text-slate-500 mt-1">Default exclusions include node_modules, .git, etc.</p>
                            </div>
                        </div>

                        {/* Right Column: Status and Action */}
                        <div className="flex flex-col bg-slate-900/70 p-6 rounded-lg">
                            <h2 className="text-xl font-semibold text-cyan-300 mb-4">3. Package & Download</h2>
                            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
                                {files ? (
                                    <>
                                        <FileIcon className="w-16 h-16 text-cyan-500"/>
                                        <p className="font-semibold text-lg">{projectName}</p>
                                        <div className="text-sm space-y-1">
                                            <p>Total files detected: <span className="font-bold text-cyan-400">{files.length}</span></p>
                                            <p>Files after exclusion: <span className="font-bold text-green-400">{filteredFiles.length}</span></p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <FolderIcon className="w-16 h-16 text-slate-600"/>
                                        <p className="text-slate-400">Awaiting folder selection...</p>
                                    </>
                                )}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={processAndGenerateTxt}
                                    disabled={!files || isLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
                                >
                                    {isLoading ? ( <LoadingSpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5" /> ) : ( 'Generate TXT Package' )}
                                </button>
                            </div>

                            <div className="mt-4 text-center text-sm text-slate-400 h-10 flex items-center justify-center">
                                <p>{status}</p>
                            </div>
                            
                            <div className="mt-2 space-y-3">
                                {txtUrl && (
                                    <div className="animate-fade-in">
                                        <a
                                            href={txtUrl}
                                            download={projectName ? `${projectName}_source_code.txt` : 'source_code.txt'}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
                                        >
                                            <DocumentTextIcon className="mr-3 h-5 w-5" />
                                            Download TXT
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;