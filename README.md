# LinkedIn Job Tracker

A web application to track job applications from LinkedIn. The application scrapes job information, stores job data, and allows users to update the status of applications.

## Features

- Scrape job information from LinkedIn job URLs
- Track job application status (Applied, Responded, Interviewing, Accepted, Rejected)
- AI-powered job analysis to extract skills, experience level, and more
- Organize and filter job applications
- Set reminders and mark favorites
- Add notes to job applications

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

## DEMO

![alt text](https://github.com/user-attachments/assets/081cf196-4df8-419f-9364-8957077ae2a0)

- Click on the arrow and copy link
- Put it in the Job tracker

![alt text](](https://github.com/user-attachments/assets/0043f9bc-63e4-4aa2-9a91-5a2106beaf33)




