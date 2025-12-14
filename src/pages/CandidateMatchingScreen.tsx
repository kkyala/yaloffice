import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { useAI } from '../context/AIProvider';
import { TargetIcon } from '../components/Icons';

// Type Definitions
type Job = { id: number; title: string; description: string; };
type Candidate = { id: number; name: string; dob: string; role: string; };
type RankedCandidate = Candidate & { resumeScore: number; interviewScore: number; skillScore: number; suitabilityScore: number; totalScore: number; };

// Helper to ensure scores are within the 0-10 range
const clampScore = (score: number): number => {
    if (typeof score !== 'number' || isNaN(score)) return 0;
    return Math.min(Math.max(score, 0), 10);
};

// New visual score bar component
const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="score-bar-item">
        <div className="score-bar-labels">
            <span>{label}</span>
            <span>{score.toFixed(1)}</span>
        </div>
        <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${score * 10}%` }}></div>
        </div>
    </div>
);

// FIX: Explicitly typing the component props with React.FC to resolve issues with the special 'key' prop.
type RankedCandidateCardProps = {
    candidate: RankedCandidate;
    rank: number;
    isSelected: boolean;
    onSelect: (candidateId: number) => void;
};
const RankedCandidateCard: React.FC<RankedCandidateCardProps> = ({ candidate, rank, isSelected, onSelect }) => {
    return (
        <div className={`ranked-candidate-card ${isSelected ? 'selected' : ''}`}>
            <div className="card-selection">
                <input type="checkbox" checked={isSelected} onChange={() => onSelect(candidate.id)} aria-label={`Select ${candidate.name}`} />
            </div>
            <div className="card-rank">#{rank}</div>
            <div className="card-candidate-info">
                <h4>{candidate.name}</h4>
                <p>{candidate.role}</p>
            </div>
            <div className="card-scores">
                <ScoreBar score={candidate.resumeScore} label="Resume" />
                <ScoreBar score={candidate.skillScore} label="Skills" />
                <ScoreBar score={candidate.suitabilityScore} label="Suitability" />
            </div>
            <div className="card-total-score">
                <span>Total Score</span>
                <p>{candidate.totalScore.toFixed(1)}</p>
            </div>
        </div>
    );
};


export default function CandidateMatchingScreen({ jobsData = [], candidatesData = [], onMoveCandidates }) {
    const { reportInvalidApiKey } = useAI();
    const [selectedJobId, setSelectedJobId] = useState(jobsData[0]?.id || '');
    const [jobDescription, setJobDescription] = useState(jobsData[0]?.description || '');
    const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(new Set());

    const noCandidatesExist = candidatesData.length === 0;

    useEffect(() => {
        const job = jobsData.find(j => j.id === selectedJobId);
        if (job) setJobDescription(job.description);
    }, [selectedJobId, jobsData]);

    const handleJobChange = (e) => {
        const jobId = parseInt(e.target.value, 10);
        setSelectedJobId(jobId);
    };

    const handleRankCandidates = async () => {
        if (!selectedJobId || noCandidatesExist) {
            setError('Please select a job and ensure there are candidates in the pipeline.');
            return;
        }
        setIsLoading(true);
        setError('');
        setRankedCandidates([]);

        try {
            const candidatesToRank = candidatesData.map(c => ({ id: c.id, name: c.name, dob: c.dob, role: c.role }));
            const prompt = `Based on the following job description, rank the candidates by scoring them on the criteria in the requested JSON schema. Respond ONLY with a valid JSON array that follows the schema, with no additional text or markdown. Job Description: "${jobDescription}". Candidates: ${JSON.stringify(candidatesToRank)}.`;
            const schema = {
                type: aiService.AISchemaType.ARRAY,
                items: {
                    type: aiService.AISchemaType.OBJECT,
                    properties: {
                        id: { type: aiService.AISchemaType.NUMBER },
                        resumeScore: { type: aiService.AISchemaType.NUMBER, description: "Candidate's resume match to the job." },
                        interviewScore: { type: aiService.AISchemaType.NUMBER, description: "A hypothetical score for interview performance." },
                        skillScore: { type: aiService.AISchemaType.NUMBER, description: "Score for technical skills alignment." },
                        suitabilityScore: { type: aiService.AISchemaType.NUMBER, description: "Overall suitability for the role." },
                        totalScore: { type: aiService.AISchemaType.NUMBER },
                        reasoning: { type: aiService.AISchemaType.STRING }
                    },
                    required: ['id', 'resumeScore', 'interviewScore', 'skillScore', 'suitabilityScore', 'totalScore', 'reasoning']
                }
            };

            const results = await aiService.generateJsonContent(prompt, schema);

            if (!results || !Array.isArray(results)) throw new Error("AI returned an invalid or empty JSON response.");

            const ranked = results.map(res => {
                const candidate = candidatesData.find(c => c.id === res.id);
                if (!candidate) return null;

                const resumeScore = clampScore(res.resumeScore);
                const interviewScore = clampScore(res.interviewScore);
                const skillScore = clampScore(res.skillScore);
                const suitabilityScore = clampScore(res.suitabilityScore);

                const totalScore = (resumeScore * 0.4) + (interviewScore * 0.4) + (skillScore * 0.1) + (suitabilityScore * 0.1);

                return {
                    ...candidate,
                    resumeScore,
                    interviewScore,
                    skillScore,
                    suitabilityScore,
                    totalScore: parseFloat(totalScore.toFixed(1))
                };
            }).filter(Boolean).sort((a, b) => b.totalScore - a.totalScore);

            setRankedCandidates(ranked.slice(0, 10));

        } catch (err) {
            console.error(err);
            if (err.message?.toLowerCase().includes('api key not valid')) {
                reportInvalidApiKey();
                return;
            }
            setError('Failed to match candidates. The AI returned an unexpected response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // FIX: Added explicit 'number' type to the function parameter to match prop type definition.
    const handleSelectCandidate = (candidateId: number) => {
        const newSet = new Set(selectedCandidateIds);
        if (newSet.has(candidateId)) newSet.delete(candidateId);
        else newSet.add(candidateId);
        setSelectedCandidateIds(newSet);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedCandidateIds(new Set(rankedCandidates.map(c => c.id)));
        else setSelectedCandidateIds(new Set());
    };

    const handleMoveToPipeline = () => {
        const candidatesToMove = rankedCandidates.filter(c => selectedCandidateIds.has(c.id));
        onMoveCandidates(candidatesToMove, selectedJobId);
        setSelectedCandidateIds(new Set());
    };

    return (
        <>
            <header className="page-header">
                <h1>AI Candidate Match</h1>
                {rankedCandidates.length > 0 && (
                    <div className="header-actions">
                        {selectedCandidateIds.size > 0 && (
                            <button className="btn btn-secondary" onClick={handleMoveToPipeline}>
                                Move {selectedCandidateIds.size} Selected to Pipeline
                            </button>
                        )}
                    </div>
                )}
            </header>
            <div className="candidate-matching-container">
                <div className="matching-controls-panel">
                    <div className="form-group">
                        <label htmlFor="job-select-match">1. Select Job to Match Against</label>
                        <select id="job-select-match" value={selectedJobId} onChange={handleJobChange}>
                            {jobsData.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="job-desc-match">2. Review Job Description</label>
                        <textarea id="job-desc-match" value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={5}></textarea>
                    </div>
                    <button className="btn btn-primary btn-full" onClick={handleRankCandidates} disabled={isLoading || noCandidatesExist}>
                        {isLoading ? 'Analyzing Candidates...' : '3. Find Best Matches with AI'}
                    </button>
                    {noCandidatesExist && <p className="no-candidates-warning">Please add candidates to your talent pool before running the match.</p>}
                </div>

                <div className="matching-results-panel">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <h3>Analyzing candidates...</h3>
                            <p>Our AI is reviewing resumes against the job description to find the best matches.</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <h3>An Error Occurred</h3>
                            <p>{error}</p>
                        </div>
                    ) : rankedCandidates.length > 0 ? (
                        <div className="ranked-list-container">
                            <div className="ranked-list-header">
                                <div className="header-selection">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedCandidateIds.size === rankedCandidates.length && rankedCandidates.length > 0}
                                        aria-label="Select all candidates"
                                    />
                                    <span>Select All</span>
                                </div>
                                <h3>Top {rankedCandidates.length} Matches Found</h3>
                            </div>
                            <div className="ranked-list">
                                {rankedCandidates.map((c, index) => (
                                    <RankedCandidateCard
                                        key={c.id}
                                        candidate={c}
                                        rank={index + 1}
                                        isSelected={selectedCandidateIds.has(c.id)}
                                        onSelect={handleSelectCandidate}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="initial-state">
                            <TargetIcon />
                            <h3>Ready to Find Top Talent?</h3>
                            <p>Select a job, review the job description, and click the "Find Best Matches" button to let our AI rank your candidates instantly.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}