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
    
    // Prepend a UTF-8 Byte Order Mark (BOM) to ensure correct character display in various text editors.
    const bom = '\uFEFF';
    
    return new Blob([bom + fullContent], { type: 'text/plain;charset=utf-8' });
};
