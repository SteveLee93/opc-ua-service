const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const downloads = [
    {
        url: 'https://raw.githubusercontent.com/OPCFoundation/UA-Nodeset/latest/DI/Opc.Ua.Di.NodeSet2.xml',
        fileName: 'Opc.Ua.Di.NodeSet2.xml'
    },
    {
        url: 'https://raw.githubusercontent.com/OPCFoundation/UA-Nodeset/latest/Robotics/Opc.Ua.Robotics.NodeSet2.xml',
        fileName: 'Opc.Ua.Robotics.NodeSet2.xml'
    }
];

async function downloadFiles() {
    for (const download of downloads) {
        try {
            console.log(`Downloading ${download.fileName}...`);
            const response = await fetch(download.url);
            if (!response.ok) {
                throw new Error(`Failed to download ${download.fileName}: ${response.statusText}`);
            }
            const body = await response.text();
            fs.writeFileSync(path.join(__dirname, download.fileName), body);
            console.log(`Successfully downloaded and saved ${download.fileName}`);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
}

downloadFiles(); 