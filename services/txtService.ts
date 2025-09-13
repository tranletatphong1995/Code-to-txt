import type { ProjectFile } from '../types';

export const generateTxtBlob = (files: ProjectFile[], projectName: string): Blob => {
    const header = `
============================================================
 Project: ${projectName}
============================================================
 Generated: ${new Date().toLocaleString()}
 Total Files: ${files.length}
============================================================

`;

    const contentParts = files.map(file => {
        const fileHeader = `---------- START OF FILE: ${file.path} ----------`;
        const fileFooter = `---------- END OF FILE: ${file.path} ----------`;
        return `${fileHeader}\n\n${file.content}\n\n${fileFooter}`;
    });

    const fullContent = header + contentParts.join('\n\n\n');
    
    return new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
};
