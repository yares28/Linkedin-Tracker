import os
import time
import random
import pandas as pd
import streamlit as st
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain.llms import Ollama
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from fake_useragent import UserAgent
import logging
import re

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
USERNAME = os.getenv('LINKEDIN_USERNAME')
PASSWORD = os.getenv('LINKEDIN_PASSWORD')
PROXY_LIST = os.getenv('PROXY_LIST', '').split(',')

# Initialize global cache for jobs
jobs_cache = {}

# Initialize streamlit session state cache if using streamlit
if 'st' in globals():
if 'jobs_cache' not in st.session_state:
    st.session_state.jobs_cache = {}

def initialize_langchain():
    """Initialize and return a LangChain LLM chain for job analysis"""
    try:
        # Define the prompt template for job analysis
        template = """
        Analyze the following job description and extract key information:
        
        Job Description:
        {job_description}
        
        Please extract and format the following information:
        1. Required Skills (as a list)
        2. Experience Level (entry, mid, senior)
        3. Key Responsibilities (as a list)
        4. Estimated Salary Range (if mentioned)
        5. Work Mode (remote, hybrid, onsite)
        
        Format your response as a JSON object with these keys: Skills, Experience Level, Responsibilities, Salary Range, Work Mode
        """
        
        prompt = PromptTemplate(
            input_variables=["job_description"],
            template=template
        )
        
        # Initialize the Ollama LLM
        llm = Ollama(model="llama2")
        
        # Create and return the chain
        return LLMChain(llm=llm, prompt=prompt)
    except Exception as e:
        logger.error(f"Error initializing LangChain: {e}")
        # Return a mock chain if there's an error
        return None

def get_random_proxy():
    """Return a random proxy from the list if available"""
    if PROXY_LIST and PROXY_LIST[0]:
        return random.choice(PROXY_LIST)
    return None

def setup_driver(headless=True, use_proxy=False):
    """Set up and return a configured Selenium WebDriver"""
    options = Options()
    if headless:
        options.add_argument('--headless')
    
    # Add random user agent to avoid detection
    user_agent = UserAgent().random
    options.add_argument(f'--user-agent={user_agent}')
    
    # Add proxy if requested
    if use_proxy:
        proxy = get_random_proxy()
        if proxy:
            options.add_argument(f'--proxy-server={proxy}')
    
    # Add additional options to avoid detection
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)
    
    # Create and return the driver
    driver = webdriver.Chrome(options=options)
    
    # Execute CDP commands to avoid detection
    driver.execute_cdp_cmd('Network.setUserAgentOverride', {"userAgent": user_agent})
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        '''
    })
    
    return driver

def linkedin_login(driver):
    """Log in to LinkedIn with error handling"""
    try:
        driver.get("https://www.linkedin.com/login")
        wait = WebDriverWait(driver, 10)
        
        # Wait for email input field and enter username
        email_input = wait.until(EC.presence_of_element_located((By.ID, 'username')))
        email_input.send_keys(USERNAME)
        
        # Enter password
        password_input = driver.find_element(By.ID, 'password')
        password_input.send_keys(PASSWORD)
        
        # Submit login form
        password_input.submit()
        
        # Wait for login to complete
        wait.until(EC.url_contains('feed'))
        logger.info("Successfully logged in to LinkedIn")
        return True
    
    except TimeoutException:
        logger.error("Login timed out - check if CAPTCHA or verification is required")
        return False
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return False

def scrape_job_info(url, use_langchain=True):
    """Scrape job information from LinkedIn job posting URL"""
    # Check if job is already in cache
    if 'jobs_cache' in globals() and url in jobs_cache:
        return jobs_cache[url]
    
    driver = setup_driver(headless=True, use_proxy=False)
    job_info = {}
    
    try:
        # Login if credentials are provided
        if USERNAME and PASSWORD:
            if not linkedin_login(driver):
                logger.warning("Login failed. Attempting to scrape without login.")
        
        # Navigate to job URL with random delay to avoid detection
        driver.get(url)
        time.sleep(random.uniform(2, 5))
        
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
        
        # Parse the page with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Extract job data with better error handling
        try:
            # Company name - multiple possible classes
            company_name_elem = soup.select_one('.topcard__org-name-link, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a')
            company_name = company_name_elem.text.strip() if company_name_elem else "Not specified"
            
            # Job title
            job_title_elem = soup.select_one('.topcard__title, .jobs-unified-top-card__job-title, .jobs-unified-top-card__title')
            job_title = job_title_elem.text.strip() if job_title_elem else "Not specified"
            
            # Job description
            job_desc_elem = soup.select_one('.description__text, .jobs-description-content, .jobs-description__content')
            job_description = job_desc_elem.text.strip() if job_desc_elem else "Not available"
            
            # Location
            location_elem = soup.select_one('.topcard__flavor--bullet, .jobs-unified-top-card__workplace-type, .jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet')
            location = location_elem.text.strip() if location_elem else "Not specified"
            
            # Posted date
            date_elem = soup.select_one('.posted-time-ago__text, .jobs-unified-top-card__posted-date, .jobs-unified-top-card__subtitle-secondary-grouping .jobs-unified-top-card__posted-date')
            date_posted = date_elem.text.strip() if date_elem else "Not specified"
            
            # Job type
            job_type_elem = soup.select_one('.topcard__flavor--bullet:nth-of-type(2), .jobs-unified-top-card__job-insight:nth-of-type(1), .jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__workplace-type')
            job_type = job_type_elem.text.strip() if job_type_elem else "Not specified"
            
            # Number of applicants
            applicants_elem = soup.select_one('.num-applicants__caption, .jobs-unified-top-card__applicant-count, .jobs-unified-top-card__subtitle-secondary-grouping .jobs-unified-top-card__applicant-count')
            applicants = applicants_elem.text.strip() if applicants_elem else "Not specified"
            
            # Construct job info dictionary
            job_info = {
                'Company Name': company_name,
                'Job Title': job_title,
                'Job Description': job_description,
                'Location': location,
                'Date Posted': date_posted,
                'Job Type': job_type,
                'Applicants': applicants,
                'URL': url
            }
            
            # Use LangChain to analyze job description if enabled
            if use_langchain and 'Job Description' in job_info:
                try:
                langchain = initialize_langchain()
                if langchain:
                        logger.info("Analyzing job description with AI...")
                        analysis_text = langchain.run(job_description=job_info['Job Description'])
                        
                        # Try to parse the analysis as JSON-like format
                        try:
                            # Extract skills
                            skills_match = re.search(r'Skills:?\s*\[(.*?)\]', analysis_text, re.DOTALL)
                            if skills_match:
                                skills_text = skills_match.group(1)
                                skills = [s.strip().strip('"\'') for s in skills_text.split(',')]
                                job_info['Skills'] = skills
                            
                            # Extract experience level
                            exp_match = re.search(r'Experience Level:?\s*["\']?(.*?)["\']?[,\n]', analysis_text)
                            if exp_match:
                                job_info['Experience Level'] = exp_match.group(1).strip()
                            
                            # Extract responsibilities
                            resp_match = re.search(r'Responsibilities:?\s*\[(.*?)\]', analysis_text, re.DOTALL)
                            if resp_match:
                                resp_text = resp_match.group(1)
                                responsibilities = [r.strip().strip('"\'') for r in resp_text.split(',')]
                                job_info['Responsibilities'] = responsibilities
                            
                            # Extract salary range
                            salary_match = re.search(r'Salary Range:?\s*["\']?(.*?)["\']?[,\n]', analysis_text)
                            if salary_match:
                                job_info['Salary Range'] = salary_match.group(1).strip()
                            
                            # Extract work mode
                            mode_match = re.search(r'Work Mode:?\s*["\']?(.*?)["\']?[,\n]', analysis_text)
                            if mode_match:
                                job_info['Work Mode'] = mode_match.group(1).strip()
                                
                        except Exception as e:
                            logger.error(f"Error parsing AI analysis: {e}")
                            # Store the raw analysis if parsing fails
                            job_info['AI Analysis'] = analysis_text
                except Exception as e:
                    logger.error(f"Error during AI analysis: {e}")
            
            # Cache the result
            if 'jobs_cache' in globals():
                jobs_cache[url] = job_info
            
        except Exception as e:
            logger.error(f"Error extracting job data: {str(e)}")
            raise Exception(f"Could not extract all job data: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error scraping job: {str(e)}")
        raise Exception(f"Error accessing the job listing: {str(e)}")
    
    finally:
        driver.quit()
    
    return job_info

def search_jobs(keywords, location, job_type=None, experience_level=None, max_pages=3):
    """Search for jobs on LinkedIn based on keywords and filters"""
    driver = setup_driver(headless=True)
    all_jobs = []
    
    try:
        # Login if credentials are provided
        if USERNAME and PASSWORD:
            linkedin_login(driver)
        
        # Construct search URL
        base_url = "https://www.linkedin.com/jobs/search/?"
        params = f"keywords={keywords.replace(' ', '%20')}&location={location.replace(' ', '%20')}"
        
        if job_type:
            params += f"&f_JT={job_type}"
        if experience_level:
            params += f"&f_E={experience_level}"
        
        search_url = base_url + params
        driver.get(search_url)
        time.sleep(random.uniform(2, 4))
        
        # Process each page up to max_pages
        for page in range(1, max_pages + 1):
            progress_text = f"Scraping page {page} of {max_pages}..."
            progress_bar = st.progress(0)
            
            try:
                # Wait for job listings to load
                wait = WebDriverWait(driver, 10)
                job_cards = wait.until(EC.presence_of_all_elements_located(
                    (By.CSS_SELECTOR, ".job-search-card, .jobs-search-results__list-item")
                ))
                
                # Process each job card
                for i, job_card in enumerate(job_cards):
                    progress_bar.progress((i + 1) / len(job_cards))
                    
                    try:
                        # Extract basic job info from the card
                        title_elem = job_card.find_element(By.CSS_SELECTOR, ".job-card-list__title, .job-search-card__title")
                        title = title_elem.text.strip()
                        
                        company_elem = job_card.find_element(By.CSS_SELECTOR, ".job-card-container__company-name, .job-search-card__company-name")
                        company = company_elem.text.strip()
                        
                        location_elem = job_card.find_element(By.CSS_SELECTOR, ".job-card-container__metadata-item, .job-search-card__location")
                        location_text = location_elem.text.strip()
                        
                        # Get job URL
                        link_elem = job_card.find_element(By.CSS_SELECTOR, ".job-card-list__title, .job-search-card__title")
                        job_url = link_elem.get_attribute("href")
                        
                        # Add to job list
                        all_jobs.append({
                            'Job Title': title,
                            'Company': company,
                            'Location': location_text,
                            'URL': job_url
                        })
                        
                        # Add small delay between processing cards
                        time.sleep(random.uniform(0.2, 0.5))
                    
                    except Exception as e:
                        logger.warning(f"Error processing job card: {str(e)}")
                        continue
                
                # Complete progress for this page
                progress_bar.progress(1.0)
                
                # Go to next page if not on the last page
                if page < max_pages:
                    try:
                        next_button = driver.find_element(By.CSS_SELECTOR, ".artdeco-pagination__button--next")
                        if next_button.is_enabled():
                            next_button.click()
                            time.sleep(random.uniform(2, 4))
                        else:
                            logger.info("No more pages available")
                            break
                    except NoSuchElementException:
                        logger.info("No pagination found or no more pages")
                        break
            
            except Exception as e:
                logger.error(f"Error processing page {page}: {str(e)}")
                st.error(f"Error processing page {page}: {str(e)}")
                break
    
    except Exception as e:
        logger.error(f"Error in job search: {str(e)}")
        st.error(f"Error searching for jobs: {str(e)}")
    
    finally:
        driver.quit()
    
    return all_jobs

def export_to_csv(data):
    """Export job data to CSV file"""
    df = pd.DataFrame(data)
    return df.to_csv(index=False).encode('utf-8')

def compare_jobs(job1, job2):
    """Compare two jobs and highlight differences"""
    if not job1 or not job2:
        return "One or both jobs are missing data."
    
    comparison = {}
    
    for key in set(job1.keys()) & set(job2.keys()):
        if key != 'AI Analysis' and key != 'Job Description':
            comparison[key] = {
                'Job 1': job1.get(key, 'N/A'),
                'Job 2': job2.get(key, 'N/A'),
                'Same': job1.get(key) == job2.get(key)
            }
    
    # If we have AI Analysis, use LangChain to compare the jobs
    if 'AI Analysis' in job1 and 'AI Analysis' in job2:
        llm = Ollama(model="llama2")
        compare_template = """
        Compare these two job descriptions and highlight the key differences:
        
        JOB 1: {job1_analysis}
        
        JOB 2: {job2_analysis}
        
        Please compare them based on:
        1. Required skills and experience
        2. Job responsibilities
        3. Company benefits and perks
        4. Overall job attractiveness
        """
        
        prompt = PromptTemplate(
            input_variables=["job1_analysis", "job2_analysis"],
            template=compare_template,
        )
        
        chain = LLMChain(llm=llm, prompt=prompt)