import React, { useState, useEffect } from 'react';
import { Button, Form, Alert, Spinner, Card, Row, Col, Dropdown, FormGroup, FormLabel, FormControl } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaHeadphones, FaDownload, FaVolumeUp, FaUsers, FaUserTie } from 'react-icons/fa';
import JSZip from 'jszip';

const PodcastComponent = ({ notebookId, selectedSources }) => {
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioContext, setAudioContext] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSource, setCurrentSource] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [notebookName, setNotebookName] = useState(null);
    
    // New state variables for podcast options
    const [podcastMode, setPodcastMode] = useState('normal');
    const [personCount, setPersonCount] = useState(2);
    const [hasHost, setHasHost] = useState(false);

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
                    podcastMode: podcastMode,
                    personCount: personCount,
                    hasHost: hasHost
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
            
            // Create a blob URL for the concatenated audio
            const audioData = concatenatedBuffer.getChannelData(0);
            const wavBlob = audioBufferToWav(concatenatedBuffer);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            
            // Set notebook name for the download
            setNotebookName(notebookName || 'podcast');
            
            setLoading(false);
        } catch (err) {
            console.error('Error generating podcast:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Helper function to convert AudioBuffer to WAV format
    const audioBufferToWav = (buffer) => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
        const view = new DataView(wav);
        
        // Write WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + buffer.length * blockAlign, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, buffer.length * blockAlign, true);
        
        // Write audio data
        const offset = 44;
        let index = 0;
        
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset + index, value, true);
                index += 2;
            }
        }
        
        return new Blob([wav], { type: 'audio/wav' });
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
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

    const handleDownload = () => {
        if (!audioUrl) return;
        
        try {
            // Create a temporary link element
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = `${notebookName || 'podcast'}.wav`;
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            
            // Clean up after a short delay to ensure the download starts
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
            
            console.log('Download initiated for:', `${notebookName || 'podcast'}.wav`);
        } catch (err) {
            console.error('Error downloading audio:', err);
            setError('Failed to download audio file. Please try again.');
        }
    };

    return (
        <Card className="podcast-component mb-4 shadow-sm">
            <Card.Body>
                <h4 className="mb-3">Generate Podcast</h4>
                <Form>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <div className="d-grid gap-3">
                        <Row className="g-3 mb-3">
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>Mode</FormLabel>
                                    <FormControl 
                                        as="select" 
                                        value={podcastMode}
                                        onChange={(e) => setPodcastMode(e.target.value)}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="debate">Debate</option>
                                    </FormControl>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>People</FormLabel>
                                    <FormControl 
                                        type="number" 
                                        min="2" 
                                        max="5" 
                                        value={personCount}
                                        onChange={(e) => setPersonCount(parseInt(e.target.value))}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>Host</FormLabel>
                                    <div className="d-flex align-items-center mt-2">
                                        <Form.Check 
                                            type="switch"
                                            id="host-switch"
                                            checked={hasHost}
                                            onChange={(e) => setHasHost(e.target.checked)}
                                            label={hasHost ? "Yes" : "No"}
                                        />
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                        
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={loading || !selectedSources?.length}
                            className="py-2"
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Generate 
                                </>
                            )}
                        </Button>
                        
                        {audioBuffer && (
                            <Row className="g-2">
                                <Col xs={6}>
                                    <Button
                                        variant={isPlaying ? "danger" : "success"}
                                        onClick={isPlaying ? stopAudio : playAudio}
                                        className="w-100 py-2"
                                    >
                                        {isPlaying ? (
                                            <>
                                                Stop
                                            </>
                                        ) : (
                                            <>
                                                Play
                                            </>
                                        )}
                                    </Button>
                                </Col>
                                <Col xs={6}>
                                    <Button
                                        variant="outline-primary"
                                        onClick={handleDownload}
                                        className="w-100 py-2"
                                    >
                                        Download
                                    </Button>
                                </Col>
                            </Row>
                        )}
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default PodcastComponent; 