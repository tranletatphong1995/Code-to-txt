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

    let fullContent = header + contentParts.join('\n\n\n');
    
    // 1. Normalize all possible line endings within the content to a single format (LF).
    // This handles cases where file content might have mixed (CRLF) or old Mac (CR) endings.
    fullContent = fullContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 2. Convert all LF endings to CRLF for universal compatibility, especially on Windows.
    fullContent = fullContent.replace(/\n/g, '\r\n');
    
    // 3. Prepend a UTF-8 Byte Order Mark (BOM) to ensure correct character display.
    const bom = '\uFEFF';
    
    return new Blob([bom + fullContent], { type: 'text/plain;charset=utf-8' });
};
