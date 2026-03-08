
const fs = require('fs');
const path = require('path');

// Simple parser to verify logic (mimicking our iCalParser.ts)
function parseICal(icalData) {
    const lines = icalData.split(/\r\n|\n|\r/);
    const events = [];
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) {
                events.push(currentEvent);
                currentEvent = null;
            }
        } else if (currentEvent) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex > -1) {
                let key = line.substring(0, separatorIndex);
                let value = line.substring(separatorIndex + 1);

                // Handle params in key (e.g. DTSTART;VALUE=DATE)
                if (key.includes(';')) {
                    const parts = key.split(';');
                    key = parts[0];
                    currentEvent['params'] = currentEvent['params'] || {};
                    parts.slice(1).forEach(p => {
                        const [pK, pV] = p.split('=');
                        currentEvent['params'][pK] = pV;
                    });
                }

                currentEvent[key] = value;
            }
        }
    }
    return events;
}

const icalContent = fs.readFileSync(path.join(__dirname, 'booking.ics'), 'utf8');
const parsed = parseICal(icalContent);

console.log('--- Raw Parsed Events ---');
console.log(JSON.stringify(parsed, null, 2));

console.log('\n--- Analysis ---');
parsed.forEach((evt, index) => {
    console.log(`Event ${index + 1}:`);
    console.log(`  UID: ${evt.UID}`);
    console.log(`  Summary: ${evt.SUMMARY}`);
    console.log(`  Dates: ${evt.DTSTART} to ${evt.DTEND}`);

    // Reverse Engineering Logic
    let type = 'RESERVATION';
    if (evt.SUMMARY && evt.SUMMARY.toLowerCase().includes('closed')) {
        type = 'BLOCKED_DATE';
    }

    console.log(`  -> Proposed Type: ${type}`);
});
