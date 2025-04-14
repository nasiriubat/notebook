import React, { useState, useEffect } from 'react';
import { Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import JSZip from 'jszip';

const PodcastComponent = ({ notebookId, selectedSources }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioContext, setAudioContext] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSource, setCurrentSource] = useState(null);

    // Initialize audio context on component mount
    useEffect(() => {
        try {
            // Create audio context on user interaction to comply with browser autoplay policies
            const initAudioContext = () => {
                if (!audioContext) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) {
                        const ctx = new AudioContext();
                        setAudioContext(ctx);
                    } else {
                        setError('Your browser does not support the Web Audio API');
                    }
                }
            };

            // Add event listeners for user interaction
            document.addEventListener('click', initAudioContext, { once: true });
            document.addEventListener('keydown', initAudioContext, { once: true });
            document.addEventListener('touchstart', initAudioContext, { once: true });

            // Cleanup
            return () => {
                document.removeEventListener('click', initAudioContext);
                document.removeEventListener('keydown', initAudioContext);
                document.removeEventListener('touchstart', initAudioContext);
            };
        } catch (err) {
            console.error('Error initializing audio context:', err);
            setError('Failed to initialize audio playback. Please try a different browser.');
        }
    }, [audioContext]);

    const handleGenerate = async () => {
        if (!selectedSources || selectedSources.length === 0) {
            setError('Please select at least one source');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use the environment variable for the API URL
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/podcast/generate/${notebookId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sources: selectedSources,
                    title,
                    description
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate podcast');
            }

            // Get the zip file
            const zipBlob = await response.blob();
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(zipBlob);

            // Ensure audio context is initialized
            if (!audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    const ctx = new AudioContext();
                    setAudioContext(ctx);
                } else {
                    throw new Error('Your browser does not support the Web Audio API');
                }
            }

            // Load all audio segments
            const segmentPromises = [];
            for (let i = 0; i < Object.keys(zipContents.files).length; i++) {
                const segmentFile = zipContents.file(`segment_${i}.mp3`);
                if (segmentFile) {
                    const arrayBuffer = await segmentFile.async('arraybuffer');
                    segmentPromises.push(audioContext.decodeAudioData(arrayBuffer));
                }
            }

            // Wait for all segments to be decoded
            const audioBuffers = await Promise.all(segmentPromises);

            // Concatenate all buffers
            const totalLength = audioBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
            const concatenatedBuffer = audioContext.createBuffer(
                audioBuffers[0].numberOfChannels,
                totalLength,
                audioBuffers[0].sampleRate
            );

            let offset = 0;
            audioBuffers.forEach(buffer => {
                for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                    const concatenatedData = concatenatedBuffer.getChannelData(channel);
                    const bufferData = buffer.getChannelData(channel);
                    concatenatedData.set(bufferData, offset);
                }
                offset += buffer.length;
            });

            setAudioBuffer(concatenatedBuffer);
            setLoading(false);
        } catch (err) {
            console.error('Error generating podcast:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const playAudio = () => {
        if (!audioContext || !audioBuffer) return;

        // Resume audio context if it's suspended (browser policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                startPlayback();
            }).catch(err => {
                console.error('Error resuming audio context:', err);
                setError('Failed to play audio. Please try again.');
            });
        } else {
            startPlayback();
        }
    };

    const startPlayback = () => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        setCurrentSource(source);
        setIsPlaying(true);

        source.onended = () => {
            setIsPlaying(false);
            setCurrentSource(null);
        };
    };

    const stopAudio = () => {
        if (currentSource) {
            currentSource.stop();
            setCurrentSource(null);
            setIsPlaying(false);
        }
    };

    return (
        <div className="podcast-component p-3 border rounded mb-3">
            <h4>Generate Podcast</h4>
            <Form>
                <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter podcast title"
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter podcast description"
                    />
                </Form.Group>
                {error && <Alert variant="danger">{error}</Alert>}
                <div className="d-flex gap-2">
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={loading || !selectedSources?.length}
                    >
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FaMicrophone className="me-2" />
                                Generate Podcast
                            </>
                        )}
                    </Button>
                    {audioBuffer && (
                        <Button
                            variant={isPlaying ? "danger" : "success"}
                            onClick={isPlaying ? stopAudio : playAudio}
                        >
                            {isPlaying ? (
                                <>
                                    <FaStop className="me-2" />
                                    Stop
                                </>
                            ) : (
                                <>
                                    <FaMicrophone className="me-2" />
                                    Play
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </Form>
        </div>
    );
};

export default PodcastComponent; 