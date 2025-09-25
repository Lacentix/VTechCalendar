class Parser {
    constructor() {
        this.timezone = 'Europe/Vilnius';
    }

    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                    let text = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        text += pageText + '\n';
                    }

                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    parseScheduleData(text) {
        const events = [];
        let semesterActualStart;

        const semesterMatch = text.match(/(\d{4}-\d{2}-\d{2})\s*—\s*(\d{4}-\d{2}-\d{2})/);
        let startDate, endDate;

        if (semesterMatch) {
            const semesterStart = new Date(semesterMatch[1]);
            const extractedEnd = new Date(semesterMatch[2]);

            let mondayOfWeek = new Date(semesterStart);
            const dayOfWeek = mondayOfWeek.getDay();
            const daysToSubtract = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
            mondayOfWeek.setDate(mondayOfWeek.getDate() - daysToSubtract);
            startDate = mondayOfWeek;

            if (text.toLowerCase().includes('autumn') || semesterStart.getMonth() >= 8) {
                endDate = new Date(semesterStart.getFullYear() + 1, 0, 26);
            } else if (text.toLowerCase().includes('spring') || semesterStart.getMonth() <= 5) {
                endDate = new Date(semesterStart.getFullYear(), 6, 31);
            } else {
                endDate = extractedEnd;
            }

            semesterActualStart = semesterStart;
        } else {
            const currentYear = new Date().getFullYear();
            startDate = new Date(currentYear, 8, 1);
            endDate = new Date(currentYear + 1, 0, 26);
            semesterActualStart = new Date(currentYear, 8, 4);
        }

        const dayPatterns = {
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5
        };


        const dayMatches = [];
        for (const [dayName, dayNum] of Object.entries(dayPatterns)) {
            const dayRegex = new RegExp(`${dayName}\\s+2025-\\d{2}-\\d{2}`, 'g');
            let dayMatch;
            while ((dayMatch = dayRegex.exec(text)) !== null) {
                dayMatches.push({ day: dayNum, name: dayName, index: dayMatch.index });
            }
        }

        dayMatches.sort((a, b) => a.index - b.index);

        for (let d = 0; d < dayMatches.length; d++) {
            const currentDayInfo = dayMatches[d];
            const nextDayInfo = dayMatches[d + 1];

            const dayText = nextDayInfo
                ? text.substring(currentDayInfo.index, nextDayInfo.index)
                : text.substring(currentDayInfo.index);

            const timePattern = /(\d+\s+\d{2}:\d{2}-\d{2}:\d{2}\s+\d+(?:\s+\d+)?)/g;
            const matches = [...dayText.matchAll(timePattern)];

            for (const match of matches) {
                const fullMatch = match[1];
                const parts = fullMatch.split(/\s+/);

                if (parts.length < 3) continue;

                const lectureNum = parts[0];
                const timeRange = parts[1];
                const week = parts[2];
                const subgroup = parts[3] || '0';

                const afterTime = dayText.substring(match.index + fullMatch.length);
                const afterChunks = afterTime.split(/\s+/).slice(0, 20);

                try {
                    let subjectEnd = -1;
                    for (let j = 0; j < afterChunks.length; j++) {
                        if (afterChunks[j] && afterChunks[j].includes(')')) {
                            subjectEnd = j;
                            break;
                        }
                    }

                    if (subjectEnd === -1) subjectEnd = 2;

                    const subject = afterChunks.slice(0, subjectEnd + 1).join(' ');

                    let auditorium = '';
                    let lecturer = '';
                    let lectureType = '';
                    for (let j = subjectEnd + 1; j < afterChunks.length; j++) {
                        const chunk = afterChunks[j];
                        if (/^[PS]\d+/.test(chunk) || /^S\d+/.test(chunk)) {
                            let roomParts = [chunk];

                            let k = j + 1;
                            while (k < afterChunks.length && k < j + 4) {
                                const nextChunk = afterChunks[k];
                                if (/^\d+$/.test(nextChunk) || /^\(\w+(-\w+)*\)$/.test(nextChunk)) {
                                    roomParts.push(nextChunk);
                                    k++;
                                } else if (nextChunk && (nextChunk.includes('Dr.') || nextChunk.includes('Prof') || nextChunk.includes('Assoc'))) {
                                    lecturer = afterChunks.slice(k).join(' ').split(/\s+(?=Laboratory|Lectures|Practical)/)[0];
                                    break;
                                } else {
                                    break;
                                }
                            }

                            auditorium = roomParts.join(' ');

                            if (!lecturer) {
                                for (let m = k; m < Math.min(k + 8, afterChunks.length); m++) {
                                    const chunk = afterChunks[m];
                                    if (chunk && (chunk.includes('Dr.') || chunk.includes('Prof') || chunk.includes('Assoc'))) {
                                        lecturer = afterChunks.slice(m).join(' ').split(/\s+(?=Laboratory|Lectures|Practical)/)[0];
                                        break;
                                    }
                                    if (chunk && /^[A-Z][a-zšūčąėįžŪ]+$/.test(chunk) && m + 1 < afterChunks.length) {
                                        const nextChunk = afterChunks[m + 1];
                                        if (nextChunk && /^[A-Z][a-zšūčąėįžŪ]+$/.test(nextChunk)) {
                                            lecturer = `${chunk} ${nextChunk}`;
                                            break;
                                        }
                                    }
                                }
                            }
                            break;
                        }
                    }

                    for (let j = subjectEnd + 1; j < afterChunks.length; j++) {
                        if (['Laboratory', 'Lectures', 'Practical'].some(type => afterChunks[j] && afterChunks[j].includes(type))) {
                            lectureType = afterChunks.slice(j).join(' ').split(/\s+\d+\s+\d{2}:/)[0];
                            break;
                        }
                    }


                    if (subject && timeRange) {
                        const event = {
                            subject: subject.trim(),
                            time: timeRange,
                            day: currentDayInfo.day,
                            auditorium: auditorium.trim(),
                            lecturer: lecturer.trim(),
                            type: lectureType.trim(),
                            week: week,
                            subgroup: subgroup,
                            startDate: startDate,
                            endDate: endDate,
                            semesterActualStart: semesterActualStart
                        };
                        events.push(event);

                    }
                } catch (error) {
                    continue;
                }
            }
        }

        return events;
    }

    createICSCalendar(events) {
        let ics = 'BEGIN:VCALENDAR\r\n';
        ics += 'VERSION:2.0\r\n';
        ics += 'PRODID:-//VTechCalendar//Vilnius Tech Schedule//EN\r\n';
        ics += 'CALSCALE:GREGORIAN\r\n';
        ics += 'X-WR-CALNAME:Vilnius Tech Schedule\r\n';
        ics += 'X-WR-TIMEZONE:Europe/Vilnius\r\n';

        let processedCount = 0;
        for (const eventData of events) {
            processedCount++;

            const [startTime, endTime] = eventData.time.split('-');
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);

            const startDate = new Date(eventData.startDate);
            const semesterActualStart = new Date(eventData.semesterActualStart);
            let daysAhead = eventData.day - startDate.getDay();
            if (daysAhead < 0) daysAhead += 7;
            const firstOccurrence = new Date(startDate);
            firstOccurrence.setDate(startDate.getDate() + daysAhead);

            if (firstOccurrence < semesterActualStart) {
                firstOccurrence.setDate(firstOccurrence.getDate() + 7);
            }

            if (eventData.week === '2') {
                firstOccurrence.setDate(firstOccurrence.getDate() + 7);
            }

            const startDt = new Date(firstOccurrence);
            startDt.setHours(startHour, startMin, 0, 0);

            const endDt = new Date(firstOccurrence);
            endDt.setHours(endHour, endMin, 0, 0);

            const subject = eventData.subject;
            const courseName = subject.replace(/\s*\([^)]*\)\s*/g, '').trim();

            const typeMapping = {
                'Laboratory work': 'Lab',
                'laboratory works': 'Lab',
                'Practical exercises': 'Tutorial',
                'practical work': 'Tutorial',
                'Lectures': 'Lecture'
            };

            let shortType = eventData.type;
            for (const [fullType, short] of Object.entries(typeMapping)) {
                if (eventData.type.includes(fullType)) {
                    shortType = short;
                    break;
                }
            }

            let summary = shortType && courseName ? `${shortType}: ${courseName}` : courseName || subject;
            summary = summary.replace(/:\s*\d+/g, ':').replace(/:\s*$/, '');

            const descriptionParts = [];
            if (eventData.lecturer) descriptionParts.push(eventData.lecturer);
            if (eventData.auditorium) {
                let cleanRoom = eventData.auditorium;
                if (['Dr.', 'Prof', 'Assoc'].some(title => cleanRoom.includes(title))) {
                    const parts = cleanRoom.split(' ');
                    const roomParts = [];
                    for (const part of parts) {
                        if (['Dr.', 'Prof', 'Assoc'].some(title => part.includes(title))) break;
                        roomParts.push(part);
                    }
                    cleanRoom = roomParts.length ? roomParts.join(' ') : cleanRoom;
                }
                descriptionParts.push(`Room: ${cleanRoom}`);
            }
            if (eventData.week && eventData.week !== '0') descriptionParts.push(`Week ${eventData.week}`);
            if (eventData.subgroup && eventData.subgroup !== '0') descriptionParts.push(`Subgroup ${eventData.subgroup}`);

            const location = 'Vilnius Tech';

            const uid = `vtech-${this.hashCode(JSON.stringify(eventData))}@lacentix.github.io`;
            const until = new Date(eventData.endDate);
            until.setHours(23, 59, 59, 999);

            ics += 'BEGIN:VEVENT\r\n';
            ics += `UID:${uid}\r\n`;
            ics += `DTSTART:${this.formatDate(startDt)}\r\n`;
            ics += `DTEND:${this.formatDate(endDt)}\r\n`;
            ics += `DTSTAMP:${this.formatDate(new Date())}\r\n`;
            ics += `SUMMARY:${summary}\r\n`;
            if (descriptionParts.length) {
                ics += `DESCRIPTION:${descriptionParts.join('\n')}\r\n`;
            }
            ics += `LOCATION:${location}\r\n`;
            if (eventData.week === '1' || eventData.week === '2') {
                ics += `RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=${this.formatDate(until)}\r\n`;
            } else {
                ics += `RRULE:FREQ=WEEKLY;UNTIL=${this.formatDate(until)}\r\n`;
            }
            ics += 'END:VEVENT\r\n';
        }

        ics += 'END:VCALENDAR\r\n';
        return ics;
    }

    formatDate(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    async convertPDFToICS(file) {
        const text = await this.extractTextFromPDF(file);
        const events = this.parseScheduleData(text);

        if (events.length === 0) {
            throw new Error('No schedule events found in PDF');
        }

        return this.createICSCalendar(events);
    }
}