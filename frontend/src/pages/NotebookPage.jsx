import { useParams, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState, useCallback } from "react";
import { Container, Row, Col, Button, Spinner, Alert, Nav, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTranslation } from "../utils/ln";
import { 
  faArrowLeft, 
  faBook, 
  faMessage, 
  faStickyNote,
  faPaperPlane,
  faCloudArrowUp,
  faPlus,
  faDownload,
  faTrash,
  faPen,
  faSun,
  faBars
} from "@fortawesome/free-solid-svg-icons";
import Navbar from "../components/Navbar";
import SourceComponent from "../components/SourceComponent";
import ChatComponent from "../components/ChatComponent";
import NoteComponent from "../components/NoteComponent";
import { NotebookContext } from "../context/NotebookContext";
import { getSources } from "../api/api";

export default function NotebookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentNotebook, getNotebook, loading } = useContext(NotebookContext);
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [chatKey, setChatKey] = useState(0);
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    if (id && (!currentNotebook || currentNotebook.id !== parseInt(id))) {
      getNotebook(id);
    }
  }, [id, currentNotebook, getNotebook]);

  const fetchSources = useCallback(async () => {
    try {
      const response = await getSources(id);
      setSources(response.data.reverse());
    } catch (err) {
      console.error("Error fetching sources:", err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchSources();
    }
  }, [id, fetchSources]);

  const handleSourceSelect = useCallback((selectedSourceIds) => {
    if (!Array.isArray(selectedSourceIds)) {
      console.error('selectedSourceIds is not an array');
      return;
    }
    const selected = sources.filter(source => selectedSourceIds.includes(source.id));
    setSelectedSources(selected);
  }, [sources]);

  const handleSourceUpdate = useCallback(() => {
    fetchSources();
  }, [fetchSources]);

  const handleSourceAdded = useCallback((newSource) => {
    setSources(prev => [newSource, ...prev]);
  }, []);

  const handleSourceDeleted = useCallback((deletedSourceId) => {
    setSources(prev => prev.filter(source => source.id !== deletedSourceId));
    setSelectedSources(prev => prev.filter(source => source.id !== deletedSourceId));
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <Navbar />
        <Container fluid className="flex-grow-1 d-flex align-items-center justify-content-center">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Container>
        <footer className="footer py-2 text-center">
          <span className="text-muted">GPT-LAB 2025</span>
        </footer>
      </div>
    );
  }

  if (!currentNotebook) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <Navbar />
        <Container fluid className="flex-grow-1 d-flex flex-column align-items-center justify-content-center">
          <Alert variant="danger" className="mb-4">Notebook not found</Alert>
        </Container>
        <footer className="footer py-2 text-center">
          <span className="text-muted">GPT-LAB 2025</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />
      <Container fluid className="flex-grow-1 p-0 d-flex flex-column">
        {/* Main Content */}
        <div className="p-2 flex-grow-1">
          {/* Desktop Layout */}
          <div className="d-none d-lg-block h-100">
            <Row className="g-4 h-100">
              <Col lg={3}>
                <SourceComponent 
                  notebookId={id} 
                  sources={sources} 
                  onSourcesUpdate={handleSourceUpdate}
                  onSourceSelect={handleSourceSelect}
                  onSourceDeleted={handleSourceDeleted}
                />
              </Col>
              <Col lg={6}>
                <ChatComponent 
                  key={chatKey}
                  notebookId={id} 
                  selectedSources={selectedSources}
                  onSourceAdded={handleSourceAdded}
                />
              </Col>
              <Col lg={3}>
                <NoteComponent notebookId={id} onNoteAdded={handleSourceUpdate} />
              </Col>
            </Row>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="d-lg-none h-100">
            <Tab.Container activeKey={activeTab} onSelect={setActiveTab} className="h-100">
              <Nav variant="tabs" className="modern-tabs mb-3">
                <Nav.Item>
                  <Nav.Link 
                    eventKey="chat"
                    className={`modern-tab ${activeTab === 'chat' ? 'active' : ''}`}
                  >
                    <div className="tab-icon">
                      <FontAwesomeIcon icon={faMessage} />
                    </div>
                    <div className="tab-label">
                      {getTranslation('chat')}
                    </div>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="sources"
                    className={`modern-tab ${activeTab === 'sources' ? 'active' : ''}`}
                  >
                    <div className="tab-icon">
                      <FontAwesomeIcon icon={faBook} />
                    </div>
                    <div className="tab-label">
                      {getTranslation('sources')}
                    </div>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="notes"
                    className={`modern-tab ${activeTab === 'notes' ? 'active' : ''}`}
                  >
                    <div className="tab-icon">
                      <FontAwesomeIcon icon={faStickyNote} />
                    </div>
                    <div className="tab-label">
                      {getTranslation('notes')}
                    </div>
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content className="h-100">
                <Tab.Pane eventKey="chat" className="h-100">
                  <ChatComponent 
                    key={chatKey}
                    notebookId={id} 
                    selectedSources={selectedSources}
                    onSourceAdded={handleSourceAdded}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="sources" className="h-100">
                  <SourceComponent 
                    notebookId={id} 
                    sources={sources} 
                    onSourcesUpdate={handleSourceUpdate}
                    onSourceSelect={handleSourceSelect}
                    onSourceDeleted={handleSourceDeleted}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="notes" className="h-100">
                  <NoteComponent notebookId={id} onNoteAdded={handleSourceUpdate} />
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </div>
        </div>
      </Container>
      
      <style>{`
        .footer {
          background-color: var(--bs-body-bg);
          border-top: 1px solid var(--bs-border-color);
        }
        .tab-content {
          height: calc(100% - 80px);
        }
        .tab-pane {
          height: 100%;
        }

        /* Modern Tabs Styling */
        .modern-tabs {
          display: flex;
          justify-content: space-around;
          background: var(--bs-body-bg);
          border: 1px solid var(--bs-border-color);
          padding: 0.5rem;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
          backdrop-filter: blur(10px);
        }

        .modern-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: var(--bs-gray-600);
          transition: all 0.3s ease;
          position: relative;
          border-radius: 0.75rem;
          flex: 1;
          margin: 0 0.25rem;
        }

        .modern-tab:hover {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), 0.1);
        }

        .modern-tab.active {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), 0.15);
        }

        .modern-tab.active::after {
          content: '';
          position: absolute;
          bottom: -0.5rem;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--bs-primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .tab-icon {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
          transition: transform 0.3s ease;
          color: inherit;
        }

        .modern-tab:hover .tab-icon {
          transform: translateY(-2px);
        }

        .tab-label {
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
          color: inherit;
        }

        @keyframes pulse {
          0% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateX(-50%) scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          .modern-tabs {
            background: rgba(33, 37, 41, 0.8);
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .modern-tab {
            color: var(--bs-gray-400);
          }

          .modern-tab:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--bs-primary);
          }

          .modern-tab.active {
            background: rgba(255, 255, 255, 0.15);
            color: var(--bs-primary);
          }

          /* Enhanced dark mode for source tab */
          .card {
            background: rgba(33, 37, 41, 0.8) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .source-input-area {
            background: rgba(33, 37, 41, 0.8) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 0.5rem !important;
            padding: 1rem !important;
            margin-bottom: 1rem !important;
            backdrop-filter: blur(10px) !important;
            color: var(--bs-gray-300) !important;
          }

          .source-input-area:hover {
            border-color: rgba(255, 255, 255, 0.2) !important;
            background: rgba(33, 37, 41, 0.9) !important;
          }

          .source-input-area .form-select,
          .source-input-area .form-control {
            background-color: rgba(33, 37, 41, 0.8) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: var(--bs-gray-300) !important;
          }

          .source-input-area .form-select:focus,
          .source-input-area .form-control:focus {
            background-color: rgba(33, 37, 41, 0.9) !important;
            border-color: var(--bs-primary) !important;
            color: var(--bs-gray-300) !important;
          }

          .source-input-area .text-muted {
            color: var(--bs-gray-400) !important;
          }

          .source-input-area .btn-outline-secondary {
            color: var(--bs-gray-400) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .source-input-area .btn-outline-secondary:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: var(--bs-gray-400) !important;
          }

          .source-input-area .alert {
            background-color: rgba(33, 37, 41, 0.8) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: var(--bs-gray-300) !important;
          }

          .source-input-area .alert-warning {
            background-color: rgba(255, 193, 7, 0.1) !important;
            border-color: rgba(255, 193, 7, 0.2) !important;
            color: var(--bs-warning) !important;
          }

          .source-input-area .alert-info {
            background-color: rgba(13, 202, 240, 0.1) !important;
            border-color: rgba(13, 202, 240, 0.2) !important;
            color: var(--bs-info) !important;
          }

          .source-input-area .alert-danger {
            background-color: rgba(220, 53, 69, 0.1) !important;
            border-color: rgba(220, 53, 69, 0.2) !important;
            color: var(--bs-danger) !important;
          }

          /* Icons and buttons */
          .react-icons {
            color: var(--bs-gray-400);
          }

          .btn-outline-secondary {
            color: var(--bs-gray-400) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .btn-outline-secondary:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: var(--bs-gray-400) !important;
          }

          /* Dropdown menu */
          .dropdown-menu {
            background-color: rgba(33, 37, 41, 0.95) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .dropdown-item {
            color: var(--bs-gray-300) !important;
          }

          .dropdown-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: var(--bs-gray-100) !important;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 576px) {
          .modern-tab {
            padding: 0.5rem 0.75rem;
          }

          .tab-icon {
            font-size: 1.1rem;
          }

          .tab-label {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
