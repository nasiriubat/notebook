import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, Alert, Spinner, Card, Row, Col, Dropdown, FormGroup, FormLabel, FormControl } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaHeadphones, FaDownload, FaVolumeUp, FaUsers, FaUserTie } from 'react-icons/fa';
import JSZip from 'jszip';
import { generatePodcast } from '../api/api';
import './PodcastComponent.css';

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
    
    // Animation state
    const [activeSpeaker, setActiveSpeaker] = useState(0);
    const [speakerTimings, setSpeakerTimings] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const animationIntervalRef = useRef(null);
    
    // Speaker colors
    const speakerColors = [
        '#4CAF50', // Green
        '#2196F3', // Blue
        '#F44336', // Red
        '#FFC107', // Amber
        '#9C27B0'  // Purple
    ];

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
    
    // Rotate active speaker when playing
    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setActiveSpeaker(prev => (prev + 1) % (hasHost ? personCount + 1 : personCount));
            }, 2000);
        } else {
            setActiveSpeaker(0);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, personCount, hasHost]);

    const handleGenerate = async () => {
        if (selectedSources.length === 0) {
            setError('Please select at least one source');
            return;
        }

        setLoading(true);
        setError(null);
        setAudioBuffer(null);
        setAudioUrl(null);

        try {
            const response = await generatePodcast({
                notebook_id: notebookId,
                source_ids: selectedSources
            });

            // Create a blob URL from the audio data
            const audioBlob = new Blob([response.data], { type: 'audio/wav' });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            setNotebookName(notebookName || 'podcast');

            // Initialize audio context and decode the audio data
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setAudioBuffer(audioBuffer);

        } catch (err) {
            console.error('Error generating podcast:', err);
            setError(err.message || 'Failed to generate podcast');
        } finally {
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
        
        // Create an analyzer to detect which speaker is active
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
        
        // Start playback
        source.start(0);
        setCurrentSource(source);
        setIsPlaying(true);
        
        // Set duration
        setDuration(audioBuffer.duration);
        
        // Start animation interval
        animationIntervalRef.current = setInterval(() => {
            setCurrentTime(prevTime => {
                const newTime = prevTime + 0.1; // Update every 100ms
                if (newTime >= audioBuffer.duration) {
                    clearInterval(animationIntervalRef.current);
                    return 0;
                }
                return newTime;
            });
        }, 100);
        
        // Update active speaker based on time
        const updateActiveSpeaker = () => {
            if (!isPlaying) return;
            
            // Calculate which speaker should be active based on current time
            // This is a simple rotation - in a real app, you'd parse the audio metadata
            const totalSpeakers = hasHost ? personCount + 1 : personCount;
            const timePerSpeaker = audioBuffer.duration / totalSpeakers;
            const currentSpeakerIndex = Math.floor(currentTime / timePerSpeaker);
            
            setActiveSpeaker(currentSpeakerIndex % totalSpeakers);
        };
        
        // Update speaker every 500ms
        const speakerInterval = setInterval(updateActiveSpeaker, 500);
        
        source.onended = () => {
            setIsPlaying(false);
            setCurrentSource(null);
            setCurrentTime(0);
            setActiveSpeaker(0);
            clearInterval(animationIntervalRef.current);
            clearInterval(speakerInterval);
        };
    };

    const stopAudio = () => {
        if (currentSource) {
            currentSource.stop();
            setCurrentSource(null);
            setIsPlaying(false);
            setCurrentTime(0);
            setActiveSpeaker(0);
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
            }
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

    // Render speaker avatars
    const renderSpeakerAvatars = () => {
        const totalSpeakers = hasHost ? personCount + 1 : personCount;
        const speakers = [];
        
        for (let i = 0; i < totalSpeakers; i++) {
            const isActive = i === activeSpeaker && isPlaying;
            const isHost = i === 0 && hasHost;
            
            // Calculate animation delay based on speaker index
            const animationDelay = `${i * 0.1}s`;
            
            speakers.push(
                <div 
                    key={i} 
                    className={`speaker-avatar ${isActive ? 'active' : ''}`}
                    style={{ 
                        backgroundColor: speakerColors[i % speakerColors.length],
                        transitionDelay: animationDelay
                    }}
                >
                    <div className="speaker-label">
                        {isHost ? 'Host' : `Speaker ${i + (hasHost ? 0 : 1)}`}
                    </div>
                    <div className="sound-wave-container">
                        <div 
                            className={`sound-wave-bar ${isActive ? 'animate' : ''}`}
                            style={{ animationDelay: `${i * 0.1}s` }}
                        ></div>
                        <div 
                            className={`sound-wave-bar ${isActive ? 'animate' : ''}`}
                            style={{ animationDelay: `${i * 0.1 + 0.2}s` }}
                        ></div>
                        <div 
                            className={`sound-wave-bar ${isActive ? 'animate' : ''}`}
                            style={{ animationDelay: `${i * 0.1 + 0.4}s` }}
                        ></div>
                    </div>
                </div>
            );
        }
        
        return speakers;
    };

    return (
        <Card className="podcast-component mb-4 shadow-sm">
            <Card.Body>
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
                                    <FaMicrophone className="me-2" />
                                    Generate Podcast
                                </>
                            )}
                        </Button>
                        
                        {/* Animation Container - Always visible */}
                        <div className="animation-container mt-3 p-3 rounded">
                            {!audioBuffer ? (
                                <div className="text-center text-muted">
                                    <p>Generate a podcast to see the animation</p>
                                </div>
                            ) : (
                                <div className="speakers-container">
                                    {renderSpeakerAvatars()}
                                </div>
                            )}
                        </div>
                        
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
                                                <FaStop className="me-2" />
                                                Stop
                                            </>
                                        ) : (
                                            <>
                                                <FaVolumeUp className="me-2" />
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
                                        <FaDownload className="me-2" />
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