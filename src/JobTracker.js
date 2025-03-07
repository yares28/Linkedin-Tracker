import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, ChevronDown, ChevronUp, Check, X, Briefcase, MapPin, Calendar, 
  Clock, Star, StarOff, Bell, BellOff, FileText, ExternalLink, PlusCircle, 
  Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, 
  Settings, MoreHorizontal, SortAsc, SortDesc, Mail, FileDown, Link, Menu,
  LogIn, User
} from 'lucide-react';
import './JobTracker.css';
import AppSidebar from './AppSidebar';

const JobTracker = () => {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem('trackedJobs');
    return savedJobs ? JSON.parse(savedJobs) : [];
  });
  const [expandedJob, setExpandedJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('dateApplied');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(10);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState({
    lastScraped: 'Never',
    jobsInQueue: 0,
    completedJobs: 0,
    isProcessing: false,
    error: null
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({
    username: '',
    password: ''
  });

  const inputRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trackedJobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    const updateSidebarElements = () => {
      const lastScrapedElement = document.getElementById('last-scraped-time');
      const jobsInQueueElement = document.getElementById('jobs-in-queue');
      const completedJobsElement = document.getElementById('completed-jobs');
      
      if (lastScrapedElement) lastScrapedElement.textContent = scrapingStatus.lastScraped;
      if (jobsInQueueElement) jobsInQueueElement.textContent = scrapingStatus.jobsInQueue.toString();
      if (completedJobsElement) completedJobsElement.textContent = scrapingStatus.completedJobs.toString();
    };
    
    if (isSidebarOpen) {
      requestAnimationFrame(updateSidebarElements);
    }
  }, [scrapingStatus, isSidebarOpen]);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setShowLoginModal(false);
    
    localStorage.setItem('user', JSON.stringify({ username: loginCredentials.username }));
    
    setLoginCredentials({ username: '', password: '' });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('user');
  };

  const toggleLoginModal = () => {
    setShowLoginModal(!showLoginModal);
  };

  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const scrapeJobFromLinkedIn = async (jobUrl) => {
    try {
      setScrapingStatus(prev => ({
        ...prev,
        isProcessing: true,
        jobsInQueue: prev.jobsInQueue + 1,
        error: null
      }));

      const response = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: jobUrl,
          format: 'csv'
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        const csvText = await response.text();
        const jobData = parseCSVToJobData(csvText, jobUrl);
        
        setScrapingStatus(prev => ({
          ...prev,
          lastScraped: new Date().toLocaleString(),
          jobsInQueue: Math.max(0, prev.jobsInQueue - 1),
          completedJobs: prev.completedJobs + 1,
          isProcessing: prev.jobsInQueue <= 1,
        }));

        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `job-${new Date().getTime()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return jobData;
      } else {
        const jobData = await response.json();
        
        setScrapingStatus(prev => ({
          ...prev,
          lastScraped: new Date().toLocaleString(),
          jobsInQueue: Math.max(0, prev.jobsInQueue - 1),
          completedJobs: prev.completedJobs + 1,
          isProcessing: prev.jobsInQueue <= 1,
        }));

        return jobData;
      }
    } catch (error) {
      console.error('Error scraping job:', error);
      
      setScrapingStatus(prev => ({
        ...prev,
        isProcessing: false,
        jobsInQueue: Math.max(0, prev.jobsInQueue - 1),
        error: error.message
      }));
      
      throw error;
    }
  };

  const parseCSVToJobData = (csvText, jobUrl) => {
    const lines = csvText.split('\n');
    
    const headers = lines[0].split(',').map(header => header.trim());
    
    const values = lines[1].split(',').map(value => value.trim());
    
    const csvData = {};
    headers.forEach((header, index) => {
      csvData[header] = values[index] || '';
    });
    
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: uniqueId,
      url: jobUrl,
      title: csvData['Job Title'] || 'Unknown Title',
      company: csvData['Company Name'] || 'Unknown Company',
      dateApplied: new Date().toLocaleDateString(),
      status: "applied",
      description: csvData['Job Description'] || 'No description available',
      location: csvData['Location'] || 'Unknown Location',
      jobType: csvData['Job Type'] || 'Unknown',
      datePosted: csvData['Date Posted'] || 'Unknown',
      applicants: csvData['Applicants'] || 'Unknown',
      skills: csvData['Skills'] ? csvData['Skills'].split(';') : [],
      experienceLevel: csvData['Experience Level'] || 'Unknown',
      responsibilities: csvData['Responsibilities'] ? csvData['Responsibilities'].split(';') : [],
      salaryRange: csvData['Salary Range'] || 'Not specified',
      workMode: csvData['Work Mode'] || 'Not specified',
      favorite: false,
      reminder: false,
      notes: "",
      interviewDate: null
    };
  };

  const mockScrapeJob = (jobUrl) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const jobData = {
          id: uniqueId,
          url: jobUrl,
          title: "Software Developer",
          company: "Example Tech Inc",
          dateApplied: new Date().toLocaleDateString(),
          status: "applied",
          description: "This is a mock job description that would be scraped from LinkedIn.",
          location: "Remote",
          jobType: "Full-time",
          datePosted: "2 days ago",
          applicants: "25 applicants",
          skills: ["JavaScript", "React", "Node.js"],
          experienceLevel: "Mid-level",
          responsibilities: ["Develop web applications", "Collaborate with team"],
          salaryRange: "$100,000 - $130,000",
          workMode: "Remote",
          favorite: false,
          reminder: false,
          notes: "",
          interviewDate: null
        };
        
        resolve(jobData);
      }, 1500);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim() || !url.includes('linkedin.com/jobs/')) {
      alert('Please enter a valid LinkedIn job URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      setScrapingStatus(prev => ({
        ...prev,
        isProcessing: true,
        jobsInQueue: prev.jobsInQueue + 1,
        error: null
      }));
      
      const jobData = isLoggedIn 
        ? await scrapeJobFromLinkedIn(url)
        : await mockScrapeJob(url);
      
      setJobs(prevJobs => {
        const jobExists = prevJobs.some(job => job.url === jobData.url);
        if (jobExists) {
          alert('This job is already in your list');
          return prevJobs;
        }
        return [...prevJobs, jobData];
      });
      
      setScrapingStatus(prev => ({
        ...prev,
        lastScraped: new Date().toLocaleString(),
        jobsInQueue: Math.max(0, prev.jobsInQueue - 1),
        completedJobs: prev.completedJobs + 1,
        isProcessing: false
      }));
      
      setUrl('');
    } catch (error) {
      setScrapingStatus(prev => ({
        ...prev,
        isProcessing: false,
        jobsInQueue: Math.max(0, prev.jobsInQueue - 1),
        error: error.message
      }));
      
      alert(`Failed to scrape job: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleJobExpansion = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  const updateJobStatus = (jobId, newStatus) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      )
    );
  };

  const cycleJobStatus = (jobId, currentStatus) => {
    const statusCycle = ['applied', 'responded', 'interviewing', 'accepted', 'rejected'];
    
    const currentIndex = statusCycle.indexOf(currentStatus);
    
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];
    
    updateJobStatus(jobId, nextStatus);
  };

  const toggleFavorite = (jobId) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, favorite: !job.favorite } : job
      )
    );
  };

  const toggleReminder = (jobId) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, reminder: !job.reminder } : job
      )
    );
  };

  const updateJobNotes = (jobId, notes) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, notes } : job
      )
    );
  };

  const setInterviewDate = (jobId, date) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, interviewDate: date } : job
      )
    );
  };

  const removeJob = (jobId) => {
    setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'applied': return 'status-applied';
      case 'responded': return 'status-responded';
      case 'interviewing': return 'status-interviewing';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'applied': return <Check size={14} />;
      case 'responded': return <Mail size={14} />;
      case 'interviewing': return <Calendar size={14} />;
      case 'accepted': return <Check size={14} />;
      case 'rejected': return <X size={14} />;
      default: return null;
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter !== 'all' && job.status !== filter) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'dateApplied' || sortField === 'interviewDate') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = sortedJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="job-tracker">
      <header className="job-tracker-header">
        <div className="header-left">
          <button className="menu-button" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <h1>LinkedIn Job Tracker</h1>
        </div>
        <div className="header-right">
          {isLoggedIn ? (
            <button className="user-button" onClick={handleLogout}>
              <User size={20} />
            </button>
          ) : (
            <button className="login-button" onClick={toggleLoginModal}>
              <LogIn size={20} />
            </button>
          )}
          <button className="settings-button">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {showLoginModal && (
        <div className="modal-overlay">
          <div className="login-modal">
            <button className="modal-close-button" onClick={toggleLoginModal}>
              <X size={20} />
            </button>
            <h2>Login</h2>
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={loginCredentials.username}
                  onChange={handleLoginInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={loginCredentials.password}
                  onChange={handleLoginInputChange}
                  required
                />
              </div>
              <button type="submit" className="login-submit-button">
                Login
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="job-tracker-main">
        <section className="job-input-section">
          <form onSubmit={handleSubmit} className="job-input-form">
            <div className="input-group">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter LinkedIn job URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  ref={inputRef}
                  className="search-input"
                  disabled={isLoading || scrapingStatus.isProcessing}
                />
                <div className="search-icon">
                  <Link size={16} />
                </div>
              </div>
              <button 
                type="submit" 
                className="add-job-button"
                disabled={isLoading || scrapingStatus.isProcessing}
              >
                {isLoading || scrapingStatus.isProcessing ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>Add Job</span>
                  </>
                )}
              </button>
            </div>
          </form>
          
          {scrapingStatus.isProcessing && (
            <div className="scraping-status-indicator">
              <div className="loading-spinner small"></div>
              <span>Scraping job data... ({scrapingStatus.jobsInQueue} in queue)</span>
            </div>
          )}
          
          {scrapingStatus.error && (
            <div className="scraping-error-message">
              <X size={16} />
              <span>Error: {scrapingStatus.error}</span>
            </div>
          )}
        </section>

        <section className="jobs-list-section">
          <div className="jobs-list-header">
            <h2 className="jobs-list-title">Your Job Applications</h2>
            <div className="jobs-list-actions">
              <div className="jobs-search-wrapper">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="jobs-search"
                />
                <div className="jobs-search-icon">
                  <Search size={16} />
                </div>
              </div>
              <div className="jobs-filter-wrapper">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="jobs-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="applied">Applied</option>
                  <option value="responded">Responded</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="jobs-filter-icon">
                  <Filter size={16} />
                </div>
              </div>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Briefcase size={32} />
              </div>
              <h3 className="empty-state-title">No jobs tracked yet</h3>
              <p className="empty-state-description">
                Add your first job by pasting a LinkedIn job URL in the input field above.
              </p>
            </div>
          ) : (
            <>
              <div className="jobs-grid">
                {currentJobs.map(job => (
                  <div 
                    key={job.id} 
                    className={`job-card ${job.favorite ? 'favorite' : ''}`}
                  >
                    <div className="job-card-header">
                      <div>
                        <div className="job-card-company">{job.company}</div>
                        <h3 className="job-card-title">{job.title}</h3>
                      </div>
                      <button 
                        className={`job-card-button ${job.favorite ? 'active' : ''}`}
                        onClick={() => toggleFavorite(job.id)}
                        title={job.favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {job.favorite ? <Star size={16} /> : <StarOff size={16} />}
                      </button>
                    </div>
                    
                    <div className="job-card-location">
                      <MapPin size={14} />
                      <span>{job.location}</span>
                    </div>
                    
                    <div className="job-card-details">
                      <div className="job-card-detail">
                        <Calendar size={14} />
                        <span>Applied: {job.dateApplied}</span>
                      </div>
                      {job.interviewDate && (
                        <div className="job-card-detail">
                          <Calendar size={14} />
                          <span>Interview: {job.interviewDate}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="job-card-actions">
                      <div 
                        className={`job-card-status ${getStatusClass(job.status)}`}
                        onClick={() => cycleJobStatus(job.id, job.status)}
                        title="Click to change status"
                      >
                        {getStatusIcon(job.status)}
                        <span>{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                      </div>
                      
                      <div className="job-card-buttons">
                        <button 
                          className={`job-card-button ${job.reminder ? 'active' : ''}`}
                          onClick={() => toggleReminder(job.id)}
                          title={job.reminder ? "Remove reminder" : "Set reminder"}
                        >
                          {job.reminder ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>
                        <button 
                          className="job-card-button"
                          onClick={() => toggleJobExpansion(job.id)}
                          title={expandedJob === job.id ? "Collapse details" : "Expand details"}
                        >
                          {expandedJob === job.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button 
                          className="job-card-button delete-button"
                          onClick={() => removeJob(job.id)}
                          title="Delete job"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {expandedJob === job.id && (
                      <div className="job-card-expanded">
                        <div className="job-card-description">
                          <h4><FileText size={16} /> Job Description</h4>
                          <p>{job.description}</p>
                        </div>
                        <div className="job-card-notes">
                          <h4><FileDown size={16} /> Notes</h4>
                          <textarea
                            value={job.notes || ''}
                            onChange={(e) => updateJobNotes(job.id, e.target.value)}
                            placeholder="Add your notes here..."
                          />
                        </div>
                        <div className="job-card-links">
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-card-link">
                            <ExternalLink size={14} />
                            <span>View on LinkedIn</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                      onClick={() => paginate(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    className="pagination-button"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default JobTracker;