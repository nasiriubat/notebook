import { useParams, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState, useCallback } from "react";
import { Container, Row, Col, Button, Spinner, Alert, Nav, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
          <span className="text-muted">GPT-LAB 2023</span>
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
          <span className="text-muted">GPT-LAB 2023</span>
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
              <Nav variant="tabs" className="mb-3 nav-fill">
                <Nav.Item>
                  <Nav.Link 
                    eventKey="chat"
                    className={`text-center py-3 ${activeTab === 'chat' ? 'bg-info text-white' : 'text-muted'}`}
                  >
                    <FontAwesomeIcon icon={faMessage} className="me-2" />
                    Chat
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="sources"
                    className={`text-center py-3 ${activeTab === 'sources' ? 'bg-info text-white' : 'text-muted'}`}
                  >
                    <FontAwesomeIcon icon={faBook} className="me-2" />
                    Sources
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="notes"
                    className={`text-center py-3 ${activeTab === 'notes' ? 'bg-info text-white' : 'text-muted'}`}
                  >
                    <FontAwesomeIcon icon={faStickyNote} className="me-2" />
                    Notes
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
      <footer className="footer py-2 text-center">
        <span className="text-muted">GPT-LAB 2023</span>
      </footer>
      <style>
        {`
          .footer {
            background-color: var(--bs-body-bg);
            border-top: 1px solid var(--bs-border-color);
          }
          .tab-content {
            height: calc(100% - 60px);
          }
          .tab-pane {
            height: 100%;
          }
        `}
      </style>
    </div>
  );
}
