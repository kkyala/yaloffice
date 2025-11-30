import PDFDocument from 'pdfkit';

interface ScreeningReport {
    score: number;
    summary: string;
    recommendation: string;
    keyStrengths: string[];
}

interface InterviewAnalysis {
    score: number;
    summary: string;
    strengths: string[];
    improvements: string[];
}

export const pdfService = {
    generateScreeningReport: (candidateName: string, jobTitle: string, report: ScreeningReport): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('Screening Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Candidate: ${candidateName}`);
            doc.text(`Position: ${jobTitle}`);
            doc.moveDown();

            // Score
            doc.fontSize(16).text(`Overall Score: ${report.score}/100`, { align: 'center' });
            doc.moveDown();

            // Recommendation
            doc.fontSize(14).text('Recommendation:', { underline: true });
            doc.fontSize(12).text(report.recommendation);
            doc.moveDown();

            // Summary
            doc.fontSize(14).text('Summary:', { underline: true });
            doc.fontSize(12).text(report.summary);
            doc.moveDown();

            // Key Strengths
            if (report.keyStrengths && report.keyStrengths.length > 0) {
                doc.fontSize(14).text('Key Strengths:', { underline: true });
                report.keyStrengths.forEach(strength => {
                    doc.fontSize(12).text(`• ${strength}`);
                });
            }

            doc.end();
        });
    },

    generateInterviewReport: (candidateName: string, jobTitle: string, analysis: InterviewAnalysis, transcript: string): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('Interview Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Candidate: ${candidateName}`);
            doc.text(`Position: ${jobTitle}`);
            doc.moveDown();

            // Score
            doc.fontSize(16).text(`AI Score: ${analysis.score}/10`, { align: 'center' });
            doc.moveDown();

            // Summary
            doc.fontSize(14).text('Summary:', { underline: true });
            doc.fontSize(12).text(analysis.summary);
            doc.moveDown();

            // Strengths
            if (analysis.strengths && analysis.strengths.length > 0) {
                doc.fontSize(14).text('Strengths:', { underline: true });
                analysis.strengths.forEach(s => doc.fontSize(12).text(`• ${s}`));
                doc.moveDown();
            }

            // Improvements
            if (analysis.improvements && analysis.improvements.length > 0) {
                doc.fontSize(14).text('Areas for Improvement:', { underline: true });
                analysis.improvements.forEach(i => doc.fontSize(12).text(`• ${i}`));
                doc.moveDown();
            }

            // Transcript
            doc.addPage();
            doc.fontSize(16).text('Interview Transcript', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(transcript);

            doc.end();
        });
    }
};
