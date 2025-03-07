# LinkedIn Job Tracker

A web application to track job applications from LinkedIn. The application scrapes job information, stores job data, and allows users to update the status of applications.

## Features

- Scrape job information from LinkedIn job URLs
- Track job application status (Applied, Responded, Interviewing, Accepted, Rejected)
- AI-powered job analysis to extract skills, experience level, and more
- Organize and filter job applications
- Set reminders and mark favorites
- Add notes to job applications

## Project Structure

The project consists of two main components:

### Frontend (React)

- `src/JobTracker.js`: Main component for the job tracker UI
- `src/AppSidebar.js`: Sidebar component
- `src/JobTracker.css`: Styles for the job tracker

### Backend (Python)

- `src/main.py`: Handles job scraping with Selenium and BeautifulSoup
- `src/api.py`: Flask API to handle job scraping requests

## Setup and Installation

### Prerequisites

- Node.js and npm
- Python 3.8+
- Chrome browser (for Selenium)

### Frontend Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the React development server:
   ```
   npm start
   ```

### Backend Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Start the Flask API server:
   ```
   python src/api.py
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
LINKEDIN_USERNAME=your_linkedin_email
LINKEDIN_PASSWORD=your_linkedin_password
```

## Usage

1. Open the application in your browser (typically at http://localhost:3000)
2. Enter a LinkedIn job URL in the input field
3. Click "Add Job" to scrape the job information
4. Track and update the status of your job applications

## Development

The project uses:
- React for the frontend
- Flask for the API
- Selenium and BeautifulSoup for web scraping
- LangChain with Ollama for AI-powered job analysis

## License

MIT



