import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { MdBook, MdChat, MdNote, MdSource } from "react-icons/md";
import { getTranslation } from "../utils/ln";

export default function LandingPage() {
  return (
    <div className="min-vh-100">
      <Navbar />
      <div className="container py-5">
        <div className="row align-items-center">
          <div className="col-lg-6 mb-4 mb-lg-0">
            <h1 className="display-4 fw-bold mb-4">{getTranslation('yourAiNotebook')}</h1>
            <p className="lead mb-4">
              {getTranslation('landingDescription')}
            </p>
            <div className="d-flex gap-3">
              <Link to="/login" className="btn btn-primary btn-lg">
                {getTranslation('login')}
              </Link>
              <Link to="/register" className="btn btn-outline-primary btn-lg">
                {getTranslation('register')}
              </Link>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdBook size={40} className="text-primary mb-3" />
                    <h3 className="h5">{getTranslation('smartNotebooks')}</h3>
                    <p className="text-muted mb-0">
                      {getTranslation('smartNotebooksDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdChat size={40} className="text-primary mb-3" />
                    <h3 className="h5">{getTranslation('aiChat')}</h3>
                    <p className="text-muted mb-0">
                      {getTranslation('aiChatDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdNote size={40} className="text-primary mb-3" />
                    <h3 className="h5">{getTranslation('smartNotes')}</h3>
                    <p className="text-muted mb-0">
                      {getTranslation('smartNotesDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdSource size={40} className="text-primary mb-3" />
                    <h3 className="h5">{getTranslation('sourceManagement')}</h3>
                    <p className="text-muted mb-0">
                      {getTranslation('sourceManagementDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 