import fs from 'fs';
const files = [
    'src/pages/DocketPage.tsx',
    'src/pages/DashboardPage.tsx',
    'src/pages/ClientsPage.tsx',
    'src/pages/BillingPage.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove import
    content = content.replace(/import Joyride, \{\s*Step\s*\} from 'react-joyride';?\s*/g, '');

    // Remove tourSteps array
    content = content.replace(/const tourSteps:\s*Step\[\]\s*=\s*(?:\[\s*\]|\[[\s\S]*?\];?)/g, '');

    // Remove Joyride component
    content = content.replace(/<Joyride[\s\S]*?\/>\s*/g, '');

    // Attempt to remove state/handlers
    content = content.replace(/const \[runTour, setRunTour\] = useState\(.*?\);?/g, '');
    content = content.replace(/const startTourFromUrl =.*?;?/g, '');
    content = content.replace(/const startTour =.*?;?/g, '');
    content = content.replace(/const handleTourCallback[\s\S]*?};/g, '');

    fs.writeFileSync(file, content, 'utf8');
}
console.log('Done cleaning react-joyride');
