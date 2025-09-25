#!/usr/bin/env python3

import re
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any
import fitz  # PyMuPDF
from icalendar import Calendar, Event, vText
import pytz

class Parser:
    def __init__(self):
        self.timezone = pytz.timezone('Europe/Vilnius')

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text

    def parse_schedule_data(self, text: str) -> List[Dict[str, Any]]:
        events = []

        semester_match = re.search(r'(\d{4}-\d{2}-\d{2})\s*—\s*(\d{4}-\d{2}-\d{2})', text)
        if semester_match:
            start_date = datetime.strptime(semester_match.group(1), '%Y-%m-%d').date()
            extracted_end_date = datetime.strptime(semester_match.group(2), '%Y-%m-%d').date()

            if 'autumn' in text.lower() or start_date.month >= 9:
                end_date = datetime(start_date.year + 1, 1, 26).date()
            elif 'spring' in text.lower() or start_date.month <= 6:
                end_date = datetime(start_date.year, 7, 31).date()
            else:
                end_date = extracted_end_date
        else:
            start_date = datetime(2025, 9, 4).date()
            end_date = datetime(2026, 1, 26).date()

        day_patterns = {
            'Monday': 0,
            'Tuesday': 1,
            'Wednesday': 2,
            'Thursday': 3,
            'Friday': 4
        }

        current_day = None

        lines = text.split('\n')
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            for day_name, day_num in day_patterns.items():
                if day_name in line and '2025' in line:
                    current_day = day_num
                    break

            if current_day is not None and line.isdigit() and int(line) <= 10:
                try:

                    if i + 4 >= len(lines):
                        i += 1
                        continue

                    lecture_num = line
                    time_range = lines[i + 1].strip()
                    week = lines[i + 2].strip()
                    subgroup = lines[i + 3].strip()

                    subject_parts = []
                    j = i + 4
                    while j < len(lines) and not lines[j].strip().startswith('('):
                        if lines[j].strip() and not lines[j].strip().isdigit():
                            subject_parts.append(lines[j].strip())
                        j += 1

                    course_code = ""
                    if j < len(lines) and lines[j].strip().startswith('('):
                        course_code = lines[j].strip()
                        j += 1

                    subject = ' '.join(subject_parts)
                    if course_code:
                        subject = f"{subject} {course_code}"

                    auditorium = ""
                    lecturer_parts = []

                    while j < len(lines) and j < i + 20:
                        next_line = lines[j].strip()

                        if (next_line.isdigit() and int(next_line) <= 10) or \
                           any(ltype in next_line for ltype in ['Lectures', 'Laboratory', 'Practical']):
                            break

                        if re.match(r'^[PS]\d+|^S\d+\([^)]*\)\s*\d+', next_line):
                            room_match = re.match(r'^([PS]\d+|S\d+\([^)]*\)\s*\d+)', next_line)
                            if room_match:
                                auditorium = room_match.group(1)
                            remaining = next_line[len(auditorium):].strip()
                            if remaining:
                                lecturer_parts.append(remaining)
                        elif next_line and not any(day in next_line for day in day_patterns.keys()):
                            lecturer_parts.append(next_line)

                        j += 1

                    lecture_type = ""
                    while j < len(lines) and j < i + 25:
                        next_line = lines[j].strip()
                        if any(ltype in next_line for ltype in ['Lectures', 'Laboratory', 'Practical', 'work', 'exercises']):
                            type_parts = [next_line]
                            if j + 1 < len(lines) and any(t in lines[j + 1] for t in ['work', 'exercises', '(']):
                                type_parts.append(lines[j + 1].strip())
                                if j + 2 < len(lines) and lines[j + 2].strip().endswith(')'):
                                    type_parts.append(lines[j + 2].strip())
                            lecture_type = ' '.join(type_parts)
                            break
                        if next_line.isdigit() and int(next_line) <= 10:
                            break
                        j += 1

                    lecturer = ' '.join(lecturer_parts).strip()

                    if re.match(r'^\d{2}:\d{2}-\d{2}:\d{2}$', time_range) and subject:
                        event = {
                            'subject': subject.strip(),
                            'time': time_range,
                            'day': current_day,
                            'auditorium': auditorium.strip(),
                            'lecturer': lecturer.strip(),
                            'type': lecture_type.strip(),
                            'week': week,
                            'subgroup': subgroup,
                            'start_date': start_date,
                            'end_date': end_date
                        }
                        events.append(event)

                except (IndexError, ValueError):
                    pass

            i += 1

        return events

    def create_ics_calendar(self, events: List[Dict[str, Any]]) -> Calendar:
        cal = Calendar()
        cal.add('prodid', '-//VTechCalendar//Vilnius Tech Schedule//EN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('x-wr-calname', 'Vilnius Tech Schedule')
        cal.add('x-wr-timezone', 'Europe/Vilnius')

        for event_data in events:
            event = Event()

            start_time, end_time = event_data['time'].split('-')
            start_hour, start_min = map(int, start_time.split(':'))
            end_hour, end_min = map(int, end_time.split(':'))

            start_date = event_data['start_date']
            days_ahead = event_data['day'] - start_date.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            first_occurrence = start_date + timedelta(days=days_ahead)

            start_dt = self.timezone.localize(datetime.combine(
                first_occurrence,
                datetime.min.time().replace(hour=start_hour, minute=start_min)
            ))
            end_dt = self.timezone.localize(datetime.combine(
                first_occurrence,
                datetime.min.time().replace(hour=end_hour, minute=end_min)
            ))

            event.add('uid', f"vtech-{hash(str(event_data))}@lacentix.github.io")
            event.add('dtstart', start_dt)
            event.add('dtend', end_dt)
            event.add('dtstamp', datetime.now(self.timezone))

            subject = event_data['subject']
            course_name = re.sub(r'\s*\([^)]*\)\s*', '', subject).strip()

            type_mapping = {
                'Laboratory work': 'Lab',
                'laboratory works': 'Lab',
                'Practical exercises': 'Tutorial',
                'practical work': 'Tutorial',
                'Lectures': 'Lecture'
            }

            lecture_type = event_data['type']
            short_type = lecture_type
            for full_type, short in type_mapping.items():
                if full_type in lecture_type:
                    short_type = short
                    break

            if short_type and course_name:
                summary = f"{short_type}: {course_name}"
            elif course_name:
                summary = course_name
            else:
                summary = subject
            event.add('summary', summary)

            description_parts = []
            if event_data['lecturer']:
                description_parts.append(event_data['lecturer'])
            if event_data['week'] and event_data['week'] != '0':
                description_parts.append(f"Week {event_data['week']}")
            if event_data['subgroup'] and event_data['subgroup'] != '0':
                description_parts.append(f"Subgroup {event_data['subgroup']}")

            if description_parts:
                event.add('description', '\n'.join(description_parts))

            if event_data['auditorium']:
                location = event_data['auditorium']
                if any(title in location for title in ['Dr.', 'Prof', 'Assoc']):
                    parts = location.split()
                    room_parts = []
                    for part in parts:
                        if any(title in part for title in ['Dr.', 'Prof', 'Assoc']):
                            break
                        room_parts.append(part)
                    location = ' '.join(room_parts) if room_parts else location

                event.add('location', f"Vilnius Tech, {location}")

            event.add('rrule', {
                'freq': 'weekly',
                'until': self.timezone.localize(datetime.combine(
                    event_data['end_date'],
                    datetime.max.time().replace(hour=23, minute=59, second=59)
                ))
            })

            cal.add_component(event)

        return cal

    def convert_pdf_to_ics(self, pdf_path: str, output_path: str = None) -> str:
        text = self.extract_text_from_pdf(pdf_path)

        events = self.parse_schedule_data(text)

        if not events:
            raise ValueError("No schedule events found in PDF")

        cal = self.create_ics_calendar(events)

        if not output_path:
            output_path = pdf_path.replace('.pdf', '_schedule.ics')

        with open(output_path, 'wb') as f:
            f.write(cal.to_ical())

        return output_path

def main():
    parser = argparse.ArgumentParser(description='Convert Vilnius Tech PDF timetable to ICS calendar')
    parser.add_argument('--input', '-i', required=True, help='Input PDF file path')
    parser.add_argument('--output', '-o', help='Output ICS file path (optional)')

    args = parser.parse_args()

    converter = Parser()

    try:
        output_file = converter.convert_pdf_to_ics(args.input, args.output)
        print(f"Successfully converted PDF to ICS calendar!")
        print(f"Calendar saved as: {output_file}")
        print(f"Import this file into your calendar app or click to open")
    except Exception as e:
        print(f"Error converting PDF: {str(e)}")
        return 1

    return 0

if __name__ == '__main__':
    exit(main())