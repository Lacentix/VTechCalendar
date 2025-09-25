#!/usr/bin/env python3

import os
import tempfile
from flask import Flask, render_template, request, send_file, flash, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from vtechcalendar import Parser

app = Flask(__name__)
app.secret_key = 'vtechcalendar-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file selected'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)

            parser = Parser()
            ics_path = parser.convert_pdf_to_ics(file_path)

            os.remove(file_path)

            return send_file(
                ics_path,
                as_attachment=True,
                download_name=f"{filename.rsplit('.', 1)[0]}_schedule.ics",
                mimetype='text/calendar'
            )

        except Exception as e:
            return jsonify({'error': f'Failed to process PDF: {str(e)}'}), 500

    return jsonify({'error': 'Invalid file type. Please upload a PDF file.'}), 400

@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

if __name__ == '__main__':
    app.run(debug=True, port=5000)