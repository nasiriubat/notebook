import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import axios from 'axios';

const PodcastComponent = ({ selectedSources, notebookName, notebookId }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState(null);
    const [error, setError] = useState(null);
    const [podcastMetadata, setPodcastMetadata] = useState(null);

    const handleGenerate = async () => {
        if (!selectedSources || selectedSources.length === 0) {
            setError('Please select at least one source');
            return;
        }

        setIsGenerating(true);
        setError(null);
        
        try {
            // Generate a title based on notebook name and current time
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const autoTitle = `${notebookName} - ${timestamp}`;
            const autoDescription = `Podcast generated from ${notebookName} on ${now.toLocaleDateString()}`;
            
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/podcast/generate/${notebookId}`,
                {
                    title: autoTitle,
                    description: autoDescription,
                    sources: selectedSources
                },
                {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            // Extract metadata from response headers
            const metadata = {
                duration: response.headers['x-podcast-duration'],
                title: response.headers['x-podcast-title'],
                description: response.headers['x-podcast-description'],
                sourceCount: response.headers['x-podcast-source-count']
            };
            setPodcastMetadata(metadata);

            // Create a blob URL for the audio
            const blob = new Blob([response.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            // Create new audio element
            const audio = new Audio(url);
            audio.onended = () => setIsPlaying(false);
            setAudioElement(audio);

        } catch (error) {
            console.error('Error generating podcast:', error);
            setError('Failed to generate podcast. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlayPause = () => {
        if (!audioElement) return;

        if (isPlaying) {
            audioElement.pause();
        } else {
            audioElement.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleDownload = () => {
        if (!audioUrl) return;

        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${podcastMetadata?.title || 'podcast'}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="podcast-component">
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            
            <div className="d-flex gap-2 mb-3">
                <Button
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedSources || selectedSources.length === 0}
                >
                    {isGenerating ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Generating Podcast...
                        </>
                    ) : (
                        'Generate Podcast'
                    )}
                </Button>

                {audioUrl && (
                    <>
                        <Button
                            variant="outline-primary"
                            onClick={handlePlayPause}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </Button>
                        <Button
                            variant="outline-primary"
                            onClick={handleDownload}
                        >
                            <FaDownload />
                        </Button>
                    </>
                )}
            </div>

            {podcastMetadata && (
                <div className="podcast-metadata mt-2">
                    <small>
                        <strong>Duration:</strong> {podcastMetadata.duration} | 
                        <strong> Sources:</strong> {podcastMetadata.sourceCount}
                    </small>
                </div>
            )}
        </div>
    );
};

export default PodcastComponent; 