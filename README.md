# VTechCalendar

<div align="center">
<img src="https://upload.wikimedia.org/wikipedia/commons/1/12/VILNIUS-TECH-LT.png" alt="Vilnius Tech Logo" width="200">
</div>

A web application that converts Vilnius Tech lecture schedule PDFs into calendar formats (ICS) and integrates with popular calendar applications.

**🌐 [Use the web version](https://lacentix.github.io/VTechCalendar) - No installation required!** Simply upload your PDF from Mano and download your calendar file.

**💻 Or use the Python version locally** - Clone this repository and run the command-line tool for offline processing.

## Features

- **PDF Upload**: Upload your Vilnius Tech timetable PDF from Mano
- **ICS Export**: Generate standard ICS calendar files
- **Calendar Integration**: Direct integration with Google Calendar, Outlook, and Apple Calendar
- **Web Interface**: Easy-to-use web application
- **Mobile Friendly**: Responsive design for all devices
- **Vilnius Tech Optimized**: Specifically designed for Vilnius Tech schedule formats

## Demo

Try the live demo: [VTechCalendar Demo](https://lacentix.github.io/VTechCalendar)

## How It Works

1. **Upload**: Upload your semester timetable PDF
2. **Parse**: The application extracts lecture information (times, subjects, locations, lecturers)
3. **Convert**: Generates ICS calendar file with all your classes
4. **Import**: Download the ICS file or directly add to your calendar

## Supported Schedule Formats

- Vilnius Tech semester timetables
- Weekly recurring lectures
- Laboratory works and practical exercises
- Multiple time slots and subgroups

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Python with Flask
- **PDF Processing**: PyMuPDF (fitz)
- **Calendar**: icalendar library
- **Deployment**: GitHub Pages

## Installation

### Local Development

**Recommended: Use a virtual environment to avoid conflicts with system packages**

```bash
# Clone the repository
git clone https://github.com/lacentix/VTechCalendar.git
cd VTechCalendar

# Create and activate virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

**Note**: Always activate the virtual environment before running the application:
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### Web Version (Recommended)

**🌐 [VTechCalendar Web App](https://lacentix.github.io/VTechCalendar)**

- No installation required
- Works directly in your browser
- Upload your PDF from Mano and get your calendar instantly
- Fully client-side processing - your data stays private

## Usage

### Web Interface (Easiest)
1. Go to [VTechCalendar Web App](https://lacentix.github.io/VTechCalendar)
2. Upload your Vilnius Tech timetable PDF from Mano
3. Your calendar file downloads automatically
4. Import the ICS file into your calendar app

### Command Line
```bash
# Activate virtual environment first
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Convert PDF to ICS
python vtechcalendar.py --input timetable.pdf --output schedule.ics
```

## Example

Input: Vilnius Tech PDF timetable
Output: ICS file with improved calendar events:

**Calendar Event Format:**
- **Title**: Lab: General Physics, Lecture: Programming, Tutorial: English Language
- **Location**: Vilnius Tech, S6, Vilnius Tech, P2 158, Vilnius Tech, P404 (detailed auditorium info)
- **Description**: Professor name first, then week/subgroup info
  - Dr. Oleksandr Masalskyi
  - Week 1, Subgroup 1

**Example Events:**
- Lab: General Physics - Monday 08:30-10:05 at Vilnius Tech, S6 with Dr. Oleksandr Masalskyi
- Lecture: Procedural Programming - Monday 10:20-11:55 at Vilnius Tech, P2 158 with Dr. Danylo Shkundalov

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For issues related to Vilnius Tech schedule formats or bugs, please open an issue on GitHub.

## Roadmap

- Support for exam schedules
- Multiple semester support
- Calendar synchronization
