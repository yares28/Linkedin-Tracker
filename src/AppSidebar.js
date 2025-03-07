"use client"

import React, { useState } from "react"
import { 
  Briefcase, X, Home, ChevronDown, ChevronUp
} from 'lucide-react'

// Sidebar components based on the reference code
const Sidebar = ({ isOpen, onClose, children }) => {
  return (
    <div className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-overlay" onClick={onClose}></div>
      <div className="sidebar-content">
        <button className="sidebar-close-button" onClick={onClose}>
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  )
}

const SidebarHeader = ({ children }) => {
  return <div className="sidebar-header">{children}</div>
}

const SidebarContent = ({ children }) => {
  return <div className="sidebar-content-area">{children}</div>
}

const SidebarMenu = ({ children }) => {
  return <ul className="sidebar-menu">{children}</ul>
}

const SidebarMenuItem = ({ children }) => {
  return <li className="sidebar-menu-item">{children}</li>
}

const SidebarMenuButton = ({ children, isActive, onClick }) => {
  return (
    <button 
      className={`sidebar-menu-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Dropdown component for sidebar
const SidebarDropdown = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="sidebar-dropdown">
      <button 
        className="sidebar-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="sidebar-menu-item-content">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {isOpen && (
        <div className="sidebar-dropdown-content">
          {children}
        </div>
      )}
    </div>
  );
};

// Main AppSidebar component
export function AppSidebar({ isOpen, onClose }) {
  // Function to navigate to home/landing page
  const goToLandingPage = () => {
    // Navigate to the landing page (root URL)
    window.location.href = '/';
  };

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      <SidebarHeader>
        <div className="sidebar-logo">
          <Briefcase size={24} color="#0077b5" />
          <h2>LinkedIn Job Tracker</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Navigation Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Navigation</h3>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarDropdown 
                title="Job Tracking" 
                icon={<Home size={16} />}
              >
                <div className="sidebar-section-content">
                  <p>Last scraped: <span id="last-scraped-time">Never</span></p>
                  <p>Jobs in queue: <span id="jobs-in-queue">0</span></p>
                  <p>Completed jobs: <span id="completed-jobs">0</span></p>
                </div>
              </SidebarDropdown>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

export default AppSidebar