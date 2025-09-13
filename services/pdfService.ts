import type { jsPDF } from 'jspdf';
import type { ProjectFile } from '../types';

// The jspdf-autotable plugin, when loaded from a CDN, attaches the `autoTable` method
// directly to the jsPDF prototype. We need to tell TypeScript about this.
// FIX: Changed interface extension to a type intersection. This is a more robust
// way to augment an existing type from an external library and fixes the issue where
// standard jsPDF methods were not found on the extended type.
type jsPDFWithAutoTable = jsPDF & {
    autoTable: (options: any) => jsPDF;
};

const FONT_SIZE = 8;
const LINE_HEIGHT = 1.2;
const MONO_FONT = 'Courier';

export const generatePdfBlob = async (files: ProjectFile[], projectName: string): Promise<Blob> => {
    return new Promise(resolve => {
        // Explicitly get jsPDF from the window object to ensure we get the
        // version from the jspdf CDN script which has been patched by the autotable script.
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF() as jsPDFWithAutoTable;

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // --- Title Page ---
        doc.setFontSize(26);
        doc.text('Source Code Package', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
        doc.setFontSize(18);
        doc.text(projectName, pageWidth / 2, pageHeight / 2, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
        doc.text(`Total Files: ${files.length}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

        doc.addPage();

        // --- Table of Contents (Placeholder) ---
        doc.setFontSize(18);
        doc.text('Table of Contents', margin, margin);
        
        const tocData = files.map(file => [file.path, '']); // Page numbers will be filled in later
        const tocStartPage = doc.internal.getCurrentPageInfo().pageNumber;
        
        // When loaded via CDN, jspdf-autotable patches the jsPDF instance,
        // so we call `doc.autoTable` directly.
        doc.autoTable({
            head: [['File Path', 'Page']],
            body: tocData, // Draw with empty page numbers for now
            startY: margin + 10,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }, // slate-800
            styles: { fontSize: FONT_SIZE },
        });

        const tocEndPage = doc.internal.getCurrentPageInfo().pageNumber;

        // --- File Contents ---
        const pageMap: { [key: string]: number } = {};

        files.forEach(file => {
            doc.addPage();
            pageMap[file.path] = doc.internal.getCurrentPageInfo().pageNumber;

            // Header for file path
            doc.setFontSize(12).setFont(MONO_FONT, 'bold');
            doc.text(`File: ${file.path}`, margin, margin);
            doc.setDrawColor(100, 100, 100).line(margin, margin + 2, pageWidth - margin, margin + 2);
            
            // File content
            doc.setFontSize(FONT_SIZE).setFont(MONO_FONT, 'normal');
            const lines = doc.splitTextToSize(file.content, pageWidth - margin * 2);
            doc.text(lines, margin, margin + 10);
        });

        // --- Update ToC with correct Page Numbers ---
        const finalTocData = files.map(file => [file.path, pageMap[file.path] || 'N/A']);

        // Go back to the ToC page(s) and redraw the table with the page numbers
        for (let i = tocStartPage; i <= tocEndPage; i++) {
            doc.setPage(i);
            doc.autoTable({
                head: [['File Path', 'Page']],
                body: finalTocData,
                startY: margin + 10,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { fontSize: FONT_SIZE },
            });
        }

        resolve(doc.output('blob'));
    });
};
