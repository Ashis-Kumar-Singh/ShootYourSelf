'use strict';

const CURATED = {
  laptop: {
    troubleshooting: [],
    ram: [
      { title: 'How to Check RAM Compatibility Before Upgrading', link: 'https://www.crucial.com/articles/about-memory/how-to-check-ram-compatibility', snippet: 'Find compatible RAM for your laptop using Crucial\'s scanner or manual specs.', source: 'crucial.com', type: 'guide' },
      { title: 'How to Upgrade Laptop RAM', link: 'https://www.ifixit.com/Guide/How+to+Upgrade+Laptop+RAM/138801', snippet: 'Step-by-step guide to installing RAM in a laptop.', source: 'ifixit.com', type: 'guide' },
    ],
    ssd: [
      { title: 'How to Replace a Laptop Hard Drive with an SSD', link: 'https://www.ifixit.com/Guide/Laptop+Hard+Drive+Replacement/5910', snippet: 'Detailed guide to cloning and swapping your HDD for an SSD.', source: 'ifixit.com', type: 'guide' },
    ],
    battery: [
      { title: 'Laptop Battery Replacement Guide', link: 'https://www.ifixit.com/Guide/Laptop+Battery+Replacement', snippet: 'General guide to replacing laptop batteries safely.', source: 'ifixit.com', type: 'guide' },
    ],
    network: [
      { title: 'Fix WiFi Not Working on Laptop', link: 'https://support.microsoft.com/en-us/windows/fix-network-connection-issues-in-windows', snippet: 'Official Microsoft guide to fixing WiFi issues in Windows.', source: 'support.microsoft.com', type: 'guide' },
    ],
    drivers: [
      { title: 'How to Find and Update Drivers in Windows', link: 'https://support.microsoft.com/en-us/windows/update-drivers-in-windows', snippet: 'Official Microsoft guide to updating drivers in Windows.', source: 'support.microsoft.com', type: 'guide' },
    ],
    display: [
      { title: 'How to Fix Laptop Screen Flickering', link: 'https://www.tomshardware.com/how-to/fix-laptop-screen-flickering', snippet: 'Troubleshooting steps for flickering laptop displays.', source: 'tomshardware.com', type: 'guide' },
    ],
    keyboard: [
      { title: 'How to Clean a Laptop Keyboard', link: 'https://www.ifixit.com/Guide/How+to+Clean+a+Laptop+Keyboard/145330', snippet: 'Safe cleaning methods for laptop keyboards.', source: 'ifixit.com', type: 'guide' },
    ],
  },
  phone: {
    troubleshooting: [],
    screen: [
      { title: 'How to Replace a Phone Screen', link: 'https://www.ifixit.com/Guide/Screen+Replacement', snippet: 'General guide to replacing phone screens.', source: 'ifixit.com', type: 'guide' },
    ],
    battery: [
      { title: 'How to Replace Phone Battery', link: 'https://www.ifixit.com/Guide/Battery+Replacement', snippet: 'Step-by-step battery replacement guides.', source: 'ifixit.com', type: 'guide' },
    ],
    water: [
      { title: 'Water Damage Repair Guide', link: 'https://www.ifixit.com/Guide/Water+Damage+Repair', snippet: 'Steps to save a water-damaged phone.', source: 'ifixit.com', type: 'guide' },
    ],
  },
  console: {
    overheating: [
      { title: 'How to Clean Your Console to Prevent Overheating', link: 'https://www.ifixit.com/Guide/How+to+Clean+Your+Console/144612', snippet: 'Guide to cleaning dust from consoles.', source: 'ifixit.com', type: 'guide' },
    ],
  },
  smartwatch: {
    troubleshooting: [],
    screen: [
      { title: 'How to Replace a Smartwatch Screen', link: 'https://www.ifixit.com/Guide/Smartwatch+Screen+Replacement', snippet: 'Guide to replacing cracked smartwatch displays.', source: 'ifixit.com', type: 'guide' },
    ],
    battery: [
      { title: 'Smartwatch Battery Replacement Guide', link: 'https://www.ifixit.com/Guide/Smartwatch+Battery+Replacement', snippet: 'Step-by-step battery replacement for smartwatches.', source: 'ifixit.com', type: 'guide' },
    ],
  },
  camera: {
    troubleshooting: [],
    lens: [
      { title: 'How to Clean a Camera Lens', link: 'https://www.ifixit.com/Guide/Camera+Lens+Cleaning', snippet: 'Safe methods for cleaning camera lenses and sensors.', source: 'ifixit.com', type: 'guide' },
    ],
    sensor: [
      { title: 'Camera Sensor Cleaning Guide', link: 'https://www.ifixit.com/Guide/Camera+Sensor+Cleaning', snippet: 'How to safely clean your camera sensor.', source: 'ifixit.com', type: 'guide' },
    ],
  },
  router: {
    troubleshooting: [],
    firmware: [
      { title: 'How to Update Router Firmware', link: 'https://www.tomshardware.com/how-to/update-router-firmware', snippet: 'Guide to checking and updating router firmware safely.', source: 'tomshardware.com', type: 'guide' },
    ],
  },
  ereader: {
    troubleshooting: [],
    battery: [
      { title: 'Kindle Battery Replacement Guide', link: 'https://www.ifixit.com/Guide/Kindle+Battery+Replacement', snippet: 'Step-by-step guide to replacing Kindle batteries.', source: 'ifixit.com', type: 'guide' },
    ],
  },
};

function getCuratedLinks(deviceId, categoryId) {
  const catCurated = CURATED[deviceId];
  if (!catCurated) return [];
  return catCurated[categoryId] || [];
}

module.exports = { CURATED, getCuratedLinks };
