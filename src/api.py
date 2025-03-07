from flask import Flask, request, jsonify, Response
import os
import sys
import csv
import io
from main import scrape_job_info, initialize_langchain

app = Flask(__name__)

# Initialize the LangChain model
llm_chain = initialize_langchain()

@app.route('/api/scrape-job', methods=['POST'])
def scrape_job():
    """
    API endpoint to scrape job information from LinkedIn
    
    Request body:
    {
        "url": "https://www.linkedin.com/jobs/view/job-id",
        "format": "json" or "csv" (optional, defaults to "json")
    }
    """
    try:
        data = request.json
        
        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400
            
        job_url = data['url']
        output_format = data.get('format', 'json')
        
        # Validate URL
        if not job_url.startswith('https://www.linkedin.com/jobs/'):
            return jsonify({'error': 'Invalid LinkedIn job URL'}), 400
            
        # Scrape job information
        job_info = scrape_job_info(job_url, use_langchain=True)
        
        if output_format.lower() == 'csv':
            # Create CSV in memory
            csv_output = io.StringIO()
            csv_writer = csv.writer(csv_output)
            
            # Write headers
            headers = [
                'Job Title', 'Company Name', 'Job Description', 'Location', 
                'Date Posted', 'Job Type', 'Applicants', 'URL',
                'Skills', 'Experience Level', 'Responsibilities', 
                'Salary Range', 'Work Mode'
            ]
            csv_writer.writerow(headers)
            
            # Write data
            skills = ';'.join(job_info.get('Skills', [])) if isinstance(job_info.get('Skills', []), list) else job_info.get('Skills', '')
            responsibilities = ';'.join(job_info.get('Responsibilities', [])) if isinstance(job_info.get('Responsibilities', []), list) else job_info.get('Responsibilities', '')
            
            row = [
                job_info.get('Job Title', ''),
                job_info.get('Company Name', ''),
                job_info.get('Job Description', ''),
                job_info.get('Location', ''),
                job_info.get('Date Posted', ''),
                job_info.get('Job Type', ''),
                job_info.get('Applicants', ''),
                job_url,
                skills,
                job_info.get('Experience Level', ''),
                responsibilities,
                job_info.get('Salary Range', ''),
                job_info.get('Work Mode', '')
            ]
            csv_writer.writerow(row)
            
            # Return CSV response
            return Response(
                csv_output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment;filename=job-{hash(job_url)}.csv'}
            )
        else:
            # Format the JSON response
            response = {
                'id': str(hash(job_url)),
                'url': job_url,
                'title': job_info.get('Job Title', 'Unknown'),
                'company': job_info.get('Company Name', 'Unknown'),
                'dateApplied': None,  # To be filled by the frontend
                'status': 'applied',  # Default status
                'description': job_info.get('Job Description', ''),
                'location': job_info.get('Location', 'Unknown'),
                'jobType': job_info.get('Job Type', 'Unknown'),
                'datePosted': job_info.get('Date Posted', 'Unknown'),
                'applicants': job_info.get('Applicants', 'Unknown'),
                # AI-analyzed data
                'skills': job_info.get('Skills', []),
                'experienceLevel': job_info.get('Experience Level', 'Unknown'),
                'responsibilities': job_info.get('Responsibilities', []),
                'salaryRange': job_info.get('Salary Range', 'Unknown'),
                'workMode': job_info.get('Work Mode', 'Unknown'),
                # Additional tracking fields
                'favorite': False,
                'reminder': False,
                'notes': '',
                'interviewDate': None
            }
            
            return jsonify(response), 200
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 