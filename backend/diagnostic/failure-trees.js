'use strict';

const FAILURE_TREES = {
  laptop: {
    'no-display': {
      id: 'no-display',
      label: 'No Display / Black Screen',
      icon: '🖥️',
      initialQuestion: 'external-monitor',
      questions: {
        'external-monitor': {
          id: 'external-monitor',
          text: 'Does an external monitor work when you connect it?',
          answers: [
            { label: 'Yes, external display works', next: 'lid-test', confidence: { lcdCable: 0.6, backlightInverter: 0.2, screenPanel: 0.15, gpu: 0.05 } },
            { label: 'No, external also blank', next: 'keyboard-test', confidence: { gpu: 0.5, motherboard: 0.3, ram: 0.15, bios: 0.05 } },
            { label: 'I cannot test external', next: 'power-test', confidence: { lcdCable: 0.3, gpu: 0.25, motherboard: 0.2, screenPanel: 0.15, backlightInverter: 0.1 } },
          ],
        },
        'lid-test': {
          id: 'lid-test',
          text: 'Does moving the lid (opening/closing) affect the display at all?',
          answers: [
            { label: 'Yes, image flashes when moving lid', next: 'lcd-cable-path', confidence: { lcdCable: 0.9, backlightInverter: 0.05, screenPanel: 0.05 } },
            { label: 'No change when moving lid', next: 'backlight-test', confidence: { backlightInverter: 0.4, screenPanel: 0.3, lcdCable: 0.2, gpu: 0.1 } },
          ],
        },
        'backlight-test': {
          id: 'backlight-test',
          text: 'If you shine a bright flashlight at the screen, can you see a very faint image?',
          answers: [
            { label: 'Yes, faint image visible', next: 'backlight-path', confidence: { backlightInverter: 0.7, ledStrip: 0.2, screenPanel: 0.1 } },
            { label: 'No, completely black', next: 'screen-panel-path', confidence: { screenPanel: 0.6, lcdCable: 0.2, gpu: 0.15, motherboard: 0.05 } },
            { label: 'Not sure / cannot test', next: 'lcd-cable-path', confidence: { lcdCable: 0.35, screenPanel: 0.3, backlightInverter: 0.2, gpu: 0.15 } },
          ],
        },
        'power-test': {
          id: 'power-test',
          text: 'Does the laptop power on? (fans spinning, lights turning on)',
          answers: [
            { label: 'Yes, powers on but no display', next: 'external-monitor' },
            { label: 'No, no power at all', next: 'no-power-path' },
            { label: 'Fans spin but no boot', next: 'post-beep-test' },
          ],
        },
        'keyboard-test': {
          id: 'keyboard-test',
          text: 'Do the keyboard lights (Caps Lock, Num Lock) respond when pressed?',
          answers: [
            { label: 'Yes, lights respond', next: 'post-beep-test', confidence: { gpu: 0.4, motherboard: 0.3, ram: 0.2, bios: 0.1 } },
            { label: 'No, no response', next: 'no-power-path', confidence: { motherboard: 0.5, cpu: 0.2, power: 0.2, bios: 0.1 } },
            { label: 'Not sure', next: 'post-beep-test', confidence: { gpu: 0.3, motherboard: 0.3, ram: 0.2, bios: 0.2 } },
          ],
        },
        'post-beep-test': {
          id: 'post-beep-test',
          text: 'Do you hear any beeps when turning on?',
          answers: [
            { label: 'Yes, beeping sounds', next: 'beep-code-path', confidence: { ram: 0.4, gpu: 0.3, motherboard: 0.2, bios: 0.1 } },
            { label: 'No beeps at all', next: 'no-post-path', confidence: { motherboard: 0.35, cpu: 0.25, bios: 0.2, ram: 0.2 } },
            { label: 'Continuous beeping', next: 'ram-path', confidence: { ram: 0.8, motherboard: 0.15, gpu: 0.05 } },
          ],
        },
      },
      paths: {
        'lcd-cable-path': {
          id: 'lcd-cable-path',
          label: 'LCD Cable / Display Connector',
          description: 'The display cable connecting the motherboard to the screen is likely loose, damaged, or worn out.',
          confidence: 0.85,
          risk: 'low',
          difficulty: 'intermediate',
          time: '20-45 min',
          steps: [
            'Power off and remove the battery',
            'Open the display bezel',
            'Locate and reseat the LCD cable connector on both ends',
            'Check for visible damage or wear on the cable',
            'If damaged, replace the LCD cable',
          ],
          links: [
            { title: 'iFixit — Laptop Display Replacement Guides', url: 'https://www.ifixit.com/Guide/Laptop+Display+Replacement' },
          ],
        },
        'backlight-path': {
          id: 'backlight-path',
          label: 'Backlight / Inverter Failure',
          description: 'The screen is getting video signal but the backlight is not working. The inverter board or LED driver may have failed.',
          confidence: 0.72,
          risk: 'low',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Check the backlight fuse on the motherboard',
            'Test the inverter board (if applicable)',
            'Check the LED strip connection',
            'Replace the LCD panel if backlight is integrated',
          ],
          links: [
            { title: 'Tom\'s Hardware — Fix Laptop Screen Backlight', url: 'https://www.tomshardware.com/how-to/fix-laptop-screen-backlight' },
          ],
        },
        'screen-panel-path': {
          id: 'screen-panel-path',
          label: 'Failed LCD Panel',
          description: 'The LCD panel itself has failed and needs replacement.',
          confidence: 0.78,
          risk: 'low',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Identify the exact LCD panel model number (on back of screen)',
            'Purchase a compatible replacement panel',
            'Remove the bezel and old panel',
            'Install the new panel and reconnect the cable',
            'Test before reassembling',
          ],
          links: [
            { title: 'iFixit — Laptop Screen Replacement Guide', url: 'https://www.ifixit.com/Guide/Laptop+Screen+Replacement' },
          ],
        },
        'no-power-path': {
          id: 'no-power-path',
          label: 'Power / Motherboard Failure',
          description: 'The system is not receiving power or the motherboard is not responding.',
          confidence: 0.65,
          risk: 'high',
          difficulty: 'advanced',
          time: '1-3 hours',
          steps: [
            'Test with a known-working power adapter',
            'Remove the battery and try AC-only power',
            'Try a hard reset (hold power for 30 seconds with battery removed)',
            'Check for visible damage on the motherboard (burnt components)',
            'If no power still, motherboard replacement may be needed',
          ],
          links: [
            { title: 'Microsoft — Laptop Wont Turn On Troubleshooting', url: 'https://support.microsoft.com/en-us/windows/laptop-wont-turn-on' },
          ],
        },
        'beep-code-path': {
          id: 'beep-code-path',
          label: 'Diagnostic Beep Code',
          description: 'The system BIOS is reporting a hardware error through beep codes.',
          confidence: 0.7,
          risk: 'medium',
          difficulty: 'beginner',
          time: '15-30 min',
          steps: [
            'Count the beep pattern (e.g., 3 long, 2 short)',
            'Look up the beep code for your laptop brand in the BIOS manual',
            'Common codes: 1 long = RAM issue, continuous = RAM, 1 long 2 short = GPU',
            'Reseat the indicated component',
            'If problem persists, replace the faulty component',
          ],
          links: [
            { title: 'AMI BIOS Beep Codes Reference', url: 'https://www.computerhope.com/beep.htm' },
          ],
        },
        'ram-path': {
          id: 'ram-path',
          label: 'RAM / Memory Issue',
          description: 'Continuous beeping typically indicates a RAM problem.',
          confidence: 0.8,
          risk: 'low',
          difficulty: 'beginner',
          time: '10-20 min',
          steps: [
            'Power off and remove the battery',
            'Locate the RAM modules (access panel on bottom or under keyboard)',
            'Remove and reseat the RAM modules',
            'Clean the contacts with a dry cloth or eraser',
            'Test with one module at a time if multiple installed',
          ],
          links: [
            { title: 'Crucial — How to Install Laptop RAM', url: 'https://www.crucial.com/articles/about-memory/how-to-install-laptop-memory' },
          ],
        },
        'no-post-path': {
          id: 'no-post-path',
          label: 'No POST / Motherboard Issue',
          description: 'The system is not completing the power-on self-test.',
          confidence: 0.55,
          risk: 'high',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Remove all peripherals and try booting with minimum configuration',
            'Reseat the CMOS battery',
            'Try booting with one RAM stick at a time',
            'Check for bent CPU socket pins',
            'Consider motherboard replacement',
          ],
          links: [
            { title: 'Tom\'s Hardware — PC Not POSTing Troubleshooting', url: 'https://www.tomshardware.com/how-to/fix-pc-not-posting' },
          ],
        },
      },
    },

    'no-boot': {
      id: 'no-boot',
      label: 'Won\'t Boot / OS Issues',
      icon: '⬛',
      initialQuestion: 'boot-behavior',
      questions: {
        'boot-behavior': {
          id: 'boot-behavior',
          text: 'What happens when you press the power button?',
          answers: [
            { label: 'Logo appears but stuck', next: 'stuck-at-logo', confidence: { hdd: 0.3, os: 0.25, bios: 0.2, peripheral: 0.15, ram: 0.1 } },
            { label: 'Blue screen / error message', next: 'bsod-path', confidence: { driver: 0.35, ram: 0.25, software: 0.2, hdd: 0.15, gpu: 0.05 } },
            { label: 'Boot loop (restarts repeatedly)', next: 'boot-loop-path', confidence: { power: 0.3, ram: 0.25, motherboard: 0.2, driver: 0.15, hdd: 0.1 } },
            { label: 'No bootable device found', next: 'no-boot-device-path', confidence: { hdd: 0.5, bios: 0.25, cable: 0.15, hddController: 0.1 } },
          ],
        },
        'stuck-at-logo': {
          id: 'stuck-at-logo',
          text: 'Does it eventually move past the logo, or stays there indefinitely?',
          answers: [
            { label: 'Stays indefinitely', next: 'stuck-logo-path', confidence: { hdd: 0.4, bios: 0.3, peripheral: 0.2, ram: 0.1 } },
            { label: 'Takes very long but eventually loads', next: 'slow-boot-path', confidence: { hdd: 0.5, os: 0.3, startupPrograms: 0.2 } },
            { label: 'Goes to black screen after logo', next: 'no-display', confidence: { gpu: 0.4, os: 0.3, driver: 0.2, bios: 0.1 } },
          ],
        },
      },
      paths: {
        'bsod-path': {
          id: 'bsod-path',
          label: 'Blue Screen / Stop Error',
          description: 'Windows has encountered a critical error. Common causes include driver issues, failing RAM, or corrupt system files.',
          confidence: 0.65,
          risk: 'medium',
          difficulty: 'beginner',
          time: '30-60 min',
          steps: [
            'Note the error code on the blue screen (e.g., CRITICAL_PROCESS_DIED, MEMORY_MANAGEMENT)',
            'Boot into Safe Mode by pressing F8 during startup',
            'Run \'sfc /scannow\' in Command Prompt to check system files',
            'Run memory diagnostic: \'mdsched.exe\' and restart',
            'Check Event Viewer for critical errors around the crash time',
            'Update or roll back recently changed drivers',
          ],
          links: [
            { title: 'Microsoft — Blue Screen Error Troubleshooting', url: 'https://support.microsoft.com/en-us/windows/blue-screen-error-troubleshooting' },
          ],
        },
        'boot-loop-path': {
          id: 'boot-loop-path',
          label: 'Boot Loop',
          description: 'The system starts but restarts before completing boot. Often caused by failed startup repair attempts, driver issues, or hardware faults.',
          confidence: 0.6,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Interrupt boot 3 times to trigger Automatic Repair',
            'Go to Troubleshoot > Advanced Options > Startup Settings',
            'Enable Safe Mode and uninstall recent updates or drivers',
            'Run Startup Repair from Advanced Options',
            'If hardware-related, test with minimal RAM and disconnected drives',
          ],
          links: [
            { title: 'Microsoft — Fix Boot Loop in Windows', url: 'https://support.microsoft.com/en-us/windows/windows-startup-settings' },
          ],
        },
        'no-boot-device-path': {
          id: 'no-boot-device-path',
          label: 'No Bootable Device',
          description: 'The BIOS cannot find an operating system to boot from.',
          confidence: 0.75,
          risk: 'low',
          difficulty: 'beginner',
          time: '15-30 min',
          steps: [
            'Enter BIOS (F2/Del during startup) and check if the drive is detected',
            'If drive not detected: reseat the drive cable/connector',
            'If drive detected: check boot order in BIOS',
            'If neither works, the drive may have failed — test in another computer',
            'Consider data recovery before reinstalling OS',
          ],
          links: [
            { title: 'Tom\'s Hardware — No Bootable Device Fix', url: 'https://www.tomshardware.com/how-to/fix-no-bootable-device-found' },
          ],
        },
        'stuck-logo-path': {
          id: 'stuck-logo-path',
          label: 'Stuck at Logo Screen',
          description: 'The system hangs at the manufacturer logo, indicating a hardware initialization problem.',
          confidence: 0.6,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Disconnect all USB devices and external peripherals',
            'Remove recently added hardware',
            'Enter BIOS and load optimized defaults',
            'Check if a specific component is listed during POST that causes the hang',
            'Try booting with minimum hardware (one RAM stick, no SSD)',
          ],
          links: [],
        },
        'slow-boot-path': {
          id: 'slow-boot-path',
          label: 'Slow Boot / Performance',
          description: 'The system boots but is very slow. Likely a failing drive or too many startup programs.',
          confidence: 0.7,
          risk: 'low',
          difficulty: 'beginner',
          time: '30-60 min',
          steps: [
            'Open Task Manager > Startup and disable unnecessary programs',
            'Check drive health using CrystalDiskInfo or \'wmic diskdrive get status\'',
            'Run Disk Cleanup and defragment/optimize drives',
            'Consider upgrading from HDD to SSD for significant improvement',
            'Run \'chkdsk /f\' to check for file system errors',
          ],
          links: [],
        },
      },
    },

    overheating: {
      id: 'overheating',
      label: 'Overheating / Thermal Issues',
      icon: '🌡️',
      initialQuestion: 'heat-behavior',
      questions: {
        'heat-behavior': {
          id: 'heat-behavior',
          text: 'Does the laptop shut down suddenly or just get hot?',
          answers: [
            { label: 'Shuts down unexpectedly under load', next: 'thermal-shutdown-path', confidence: { thermalPaste: 0.35, dust: 0.3, fan: 0.2, heatsink: 0.15 } },
            { label: 'Very hot but stays on', next: 'fan-check', confidence: { dust: 0.4, fan: 0.3, thermalPaste: 0.2, airflow: 0.1 } },
            { label: 'Only gets hot in one spot', next: 'hotspot-path', confidence: { component: 0.5, dust: 0.3, thermalPaste: 0.2 } },
          ],
        },
        'fan-check': {
          id: 'fan-check',
          text: 'Can you hear the fans spinning?',
          answers: [
            { label: 'Fans are very loud', next: 'dust-path', confidence: { dust: 0.5, fan: 0.3, thermalPaste: 0.2 } },
            { label: 'Fans are quiet / not spinning', next: 'fan-failure-path', confidence: { fan: 0.7, motherboard: 0.2, bios: 0.1 } },
            { label: 'Fans spin but air is cold', next: 'heatsink-path', confidence: { heatsink: 0.5, thermalPaste: 0.3, fan: 0.2 } },
          ],
        },
      },
      paths: {
        'thermal-shutdown-path': {
          id: 'thermal-shutdown-path',
          label: 'Thermal Shutdown Protection',
          description: 'The CPU/GPU is reaching critical temperatures and the system shuts down to prevent damage.',
          confidence: 0.8,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '1-2 hours',
          steps: [
            'Clean all dust from fans and heatsinks using compressed air',
            'Replace thermal paste on CPU and GPU',
            'Ensure the laptop is on a hard, flat surface for airflow',
            'Use a laptop cooling pad for additional airflow',
            'Undervolt the CPU using ThrottleStop or BIOS settings',
          ],
          links: [
            { title: 'iFixit — How to Clean Your Laptop', url: 'https://www.ifixit.com/Guide/How+to+Clean+Your+Laptop/145330' },
          ],
        },
        'dust-path': {
          id: 'dust-path',
          label: 'Dust-Clogged Cooling System',
          description: 'Dust buildup in the fans and heatsink fins is preventing proper airflow.',
          confidence: 0.8,
          risk: 'low',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Power off and remove the bottom panel',
            'Locate the fan and heatsink assembly',
            'Use compressed air to blow dust out of the fan and fins',
            'Hold the fan blades to prevent spinning while cleaning',
            'Reassemble and check temperatures with HWMonitor',
          ],
          links: [
            { title: 'iFixit — Laptop Cleaning Guide', url: 'https://www.ifixit.com/Guide/How+to+Clean+Your+Laptop/145330' },
          ],
        },
        'fan-failure-path': {
          id: 'fan-failure-path',
          label: 'Fan Failure',
          description: 'The cooling fan has stopped working and needs replacement.',
          confidence: 0.85,
          risk: 'high',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Confirm fan is not spinning by listening closely',
            'Try spinning the fan manually (should spin freely)',
            'If stuck, the bearing may have failed',
            'Order a replacement fan matching the exact part number',
            'Replace the fan and apply new thermal paste while open',
          ],
          links: [
            { title: 'Amazon — Laptop Cooling Fans', url: 'https://www.amazon.com/s?k=laptop+cooling+fan' },
          ],
        },
        'heatsink-path': {
          id: 'heatsink-path',
          label: 'Heatsink / Thermal Paste Issue',
          description: 'Heat is not being transferred properly from the CPU/GPU to the heatsink.',
          confidence: 0.6,
          risk: 'medium',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Remove the heatsink assembly',
            'Clean old thermal paste from CPU and GPU using isopropyl alcohol',
            'Apply new high-quality thermal paste (pea-sized dot)',
            'Ensure heatsink is mounted with proper pressure',
            'Check that all mounting screws are tightened evenly',
          ],
          links: [
            { title: 'iFixit — How to Apply Thermal Paste', url: 'https://www.ifixit.com/Guide/How+to+Apply+Thermal+Paste' },
          ],
        },
        'hotspot-path': {
          id: 'hotspot-path',
          label: 'Localized Component Overheating',
          description: 'A specific component (VRM, chipset, or SSD) is overheating.',
          confidence: 0.5,
          risk: 'medium',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Use HWMonitor to identify which component reaches high temperatures',
            'Check if a thermal pad has degraded or shifted',
            'Ensure the SSD/component has proper airflow',
            'Add thermal pads if missing between components and chassis',
          ],
          links: [],
        },
      },
    },

    battery: {
      id: 'battery',
      label: 'Battery / Charging Issues',
      icon: '🔋',
      initialQuestion: 'charge-status',
      questions: {
        'charge-status': {
          id: 'charge-status',
          text: 'Does the laptop charge at all when plugged in?',
          answers: [
            { label: 'Not charging at all', next: 'charger-test', confidence: { charger: 0.3, chargingPort: 0.25, battery: 0.2, motherboard: 0.15, driver: 0.1 } },
            { label: 'Charges but drains quickly', next: 'battery-wear-path', confidence: { batteryAge: 0.7, calibration: 0.15, backgroundProcesses: 0.1, driver: 0.05 } },
            { label: 'Charges only when turned off', next: 'driver-battery-path', confidence: { driver: 0.4, battery: 0.3, motherboard: 0.2, bios: 0.1 } },
            { label: 'Battery not detected', next: 'battery-not-detected-path', confidence: { battery: 0.4, cable: 0.3, motherboard: 0.2, driver: 0.1 } },
          ],
        },
        'charger-test': {
          id: 'charger-test',
          text: 'Does the charging LED turn on when you plug in the charger?',
          answers: [
            { label: 'No LED at all', next: 'charger-failure-path', confidence: { charger: 0.6, chargingPort: 0.3, motherboard: 0.1 } },
            { label: 'LED turns on but battery doesnt charge', next: 'bios-battery-path', confidence: { battery: 0.4, bios: 0.25, driver: 0.2, motherboard: 0.15 } },
            { label: 'LED flickers or is unstable', next: 'charging-port-path', confidence: { chargingPort: 0.5, charger: 0.3, motherboard: 0.2 } },
          ],
        },
      },
      paths: {
        'battery-wear-path': {
          id: 'battery-wear-path',
          label: 'Battery Wear / Age',
          description: 'The battery has degraded over time and can no longer hold a full charge.',
          confidence: 0.9,
          risk: 'low',
          difficulty: 'beginner',
          time: '10 min',
          steps: [
            'Generate a battery health report: \'powercfg /batteryreport\' in Command Prompt',
            'Check the design capacity vs full charge capacity',
            'If capacity is below 80% of original, replacement recommended',
            'Calibrate the battery: fully charge, then fully discharge, then recharge',
            'If still poor, order a replacement battery',
          ],
          links: [
            { title: 'Microsoft — Battery Health Report', url: 'https://support.microsoft.com/en-us/windows/battery-health-report' },
          ],
        },
        'charger-failure-path': {
          id: 'charger-failure-path',
          label: 'Charger / Power Adapter Failure',
          description: 'The power adapter may have failed. First test with a different charger if available.',
          confidence: 0.7,
          risk: 'low',
          difficulty: 'beginner',
          time: '5-10 min',
          steps: [
            'Check if the charger LED is on (if it has one)',
            'Inspect the charger cable for damage or bends',
            'Try a different power outlet',
            'Test with a known-working compatible charger',
            'If charger is dead, order an OEM replacement',
          ],
          links: [
            { title: 'Amazon — Laptop Chargers', url: 'https://www.amazon.com/s?k=laptop+charger+power+adapter' },
          ],
        },
        'charging-port-path': {
          id: 'charging-port-path',
          label: 'Damaged Charging Port',
          description: 'The charging port (DC jack or USB-C) may be loose, damaged, or have broken solder joints.',
          confidence: 0.65,
          risk: 'medium',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Inspect the charging port for visible damage or debris',
            'Check if the charger plug fits snugly or is loose',
            'For USB-C, check for lint in the port',
            'DC jack replacement requires motherboard disassembly',
            'USB-C port replacement requires micro-soldering skills',
          ],
          links: [
            { title: 'iFixit — Laptop DC Jack Replacement', url: 'https://www.ifixit.com/Guide/DC+Jack+Replacement' },
          ],
        },
        'driver-battery-path': {
          id: 'driver-battery-path',
          label: 'Battery Driver / Configuration Issue',
          description: 'The battery management driver may be outdated or incorrectly configured.',
          confidence: 0.5,
          risk: 'low',
          difficulty: 'beginner',
          time: '15-30 min',
          steps: [
            'Open Device Manager and find the battery section',
            'Uninstall "Microsoft ACPI-Compliant Control Method Battery"',
            'Restart the laptop (driver will reinstall automatically)',
            'Update chipset drivers from the manufacturer website',
            'Reset BIOS to default settings',
          ],
          links: [],
        },
        'battery-not-detected-path': {
          id: 'battery-not-detected-path',
          label: 'Battery Not Detected',
          description: 'The system cannot communicate with the battery. Could be a connection issue or failed battery.',
          confidence: 0.55,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '15-30 min',
          steps: [
            'Power off, remove the bottom panel',
            'Disconnect and reconnect the battery connector',
            'Check for visible damage to battery wires or connector',
            'Test the battery voltage with a multimeter if possible',
            'If still not detected, battery BMS may have failed — replace battery',
          ],
          links: [],
        },
        'bios-battery-path': {
          id: 'bios-battery-path',
          label: 'BIOS / Firmware Battery Issue',
          description: 'The BIOS battery/charging configuration may be incorrect.',
          confidence: 0.35,
          risk: 'low',
          difficulty: 'beginner',
          time: '10-20 min',
          steps: [
            'Enter BIOS during startup (F2/Del)',
            'Look for battery health or charging settings',
            'Reset BIOS to optimized defaults',
            'Check for BIOS updates on the manufacturer website',
            'Update BIOS if a battery-related fix is mentioned in changelog',
          ],
          links: [],
        },
      },
    },
  },

  phone: {
    'no-power': {
      id: 'no-power',
      label: 'Won\'t Turn On / No Power',
      icon: '📱',
      initialQuestion: 'charge-response',
      questions: {
        'charge-response': {
          id: 'charge-response',
          text: 'Does the phone show any sign of life when you plug it in to charge?',
          answers: [
            { label: 'Shows charging icon', next: 'battery-dead-path', confidence: { battery: 0.6, batteryConnection: 0.2, chargingPort: 0.15, software: 0.05 } },
            { label: 'No sign of life at all', next: 'hard-brick-path', confidence: { battery: 0.35, motherboard: 0.3, chargingPort: 0.2, powerButton: 0.15 } },
            { label: 'Vibrates or shows logo then dies', next: 'boot-loop-path', confidence: { battery: 0.4, software: 0.3, motherboard: 0.2, chargingPort: 0.1 } },
          ],
        },
      },
      paths: {
        'battery-dead-path': {
          id: 'battery-dead-path',
          label: 'Deep Discharge / Dead Battery',
          description: 'The battery has been completely drained and needs time to recover.',
          confidence: 0.8,
          risk: 'low',
          difficulty: 'beginner',
          time: '1-24 hours',
          steps: [
            'Leave the phone charging for at least 30 minutes',
            'Try a different charger and cable',
            'Perform a force restart (varies by model)',
            'If no response after 2 hours, battery may need replacement',
          ],
          links: [
            { title: 'iFixit — Phone Battery Replacement', url: 'https://www.ifixit.com/Guide/Battery+Replacement' },
          ],
        },
        'hard-brick-path': {
          id: 'hard-brick-path',
          label: 'Hard Brick / No Power',
          description: 'The phone is completely unresponsive. Could be a failed battery, charging port, or motherboard.',
          confidence: 0.45,
          risk: 'high',
          difficulty: 'advanced',
          time: '1-3 hours',
          steps: [
            'Try a known-working charger and cable',
            'Clean the charging port with a wooden toothpick',
            'Attempt a force restart (volume down + power for 10-15 seconds)',
            'If possible, remove the battery and reconnect',
            'If still no response, motherboard repair or replacement needed',
          ],
          links: [],
        },
        'boot-loop-path': {
          id: 'boot-loop-path',
          label: 'Boot Loop / Logo Loop',
          description: 'The phone starts but cannot complete the boot process.',
          confidence: 0.55,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Attempt to enter recovery mode (volume up + power)',
            'Wipe the cache partition from recovery',
            'If that fails, a factory reset may be required',
            'Use ODIN (Samsung) or iTunes (iPhone) to restore firmware',
          ],
          links: [],
        },
      },
    },

    'cracked-screen': {
      id: 'cracked-screen',
      label: 'Cracked / Broken Screen',
      icon: '💔',
      initialQuestion: 'screen-damage',
      questions: {
        'screen-damage': {
          id: 'screen-damage',
          text: 'Is the glass cracked, or is the display showing black/invisible areas?',
          answers: [
            { label: 'Glass cracked but display works fine', next: 'glass-only-path', confidence: { glass: 0.9, digitizer: 0.1 } },
            { label: 'Display has black spots / bleeding', next: 'lcd-damage-path', confidence: { lcd: 0.8, glass: 0.15, digitizer: 0.05 } },
            { label: 'Touch not working but display is fine', next: 'digitizer-path', confidence: { digitizer: 0.85, lcd: 0.1, glass: 0.05 } },
            { label: 'Completely black / no display', next: 'full-assembly-path', confidence: { lcd: 0.5, connector: 0.3, motherboard: 0.2 } },
          ],
        },
      },
      paths: {
        'glass-only-path': {
          id: 'glass-only-path',
          label: 'Cracked Glass Only',
          description: 'Only the outer glass is cracked. The LCD and touch digitizer are functioning. Some phones allow glass-only replacement.',
          confidence: 0.75,
          risk: 'medium',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Check if your model supports glass-only replacement (requires a separator machine)',
            'If yes: heat the screen, separate the glass with a wire, clean the LCD, apply LOCA glue, and cure with UV light',
            'If no: the entire screen assembly must be replaced',
            'Consider professional repair for glass-only replacement',
          ],
          links: [
            { title: 'iFixit — Phone Screen Replacement', url: 'https://www.ifixit.com/Guide/Screen+Replacement' },
          ],
        },
        'lcd-damage-path': {
          id: 'lcd-damage-path',
          label: 'LCD / Display Damage',
          description: 'The LCD panel is damaged and needs full screen assembly replacement.',
          confidence: 0.9,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Power off the phone completely',
            'Remove the SIM tray and back cover (if removable)',
            'Remove the battery connection for safety',
            'Carefully remove the broken screen assembly',
            'Install the new screen assembly and test before sealing',
          ],
          links: [
            { title: 'iFixit — Phone Screen Replacement Guide', url: 'https://www.ifixit.com/Guide/Screen+Replacement' },
          ],
        },
        'digitizer-path': {
          id: 'digitizer-path',
          label: 'Digitizer / Touch Failure',
          description: 'The touch-sensitive layer (digitizer) has failed. The display may still work.',
          confidence: 0.75,
          risk: 'medium',
          difficulty: 'intermediate',
          time: '30-60 min',
          steps: [
            'Restart the phone to rule out software issues',
            'Check if touch works at all (some areas or completely dead)',
            'If completely dead and not glass-related, the digitizer needs replacement',
            'Most modern phones require full screen assembly replacement',
          ],
          links: [],
        },
        'full-assembly-path': {
          id: 'full-assembly-path',
          label: 'Complete Screen / Connection Failure',
          description: 'The entire display system is down. Could be the screen, display cable, or motherboard.',
          confidence: 0.5,
          risk: 'high',
          difficulty: 'advanced',
          time: '1-2 hours',
          steps: [
            'Check the display cable connection (inside the phone)',
            'Look for liquid damage or corrosion near the display connector',
            'Test with a known-good screen assembly if available',
            'If a replacement screen also does not work, the motherboard may need repair',
          ],
          links: [],
        },
      },
    },
  },
};

function getTree(device, category) {
  const deviceTrees = FAILURE_TREES[device];
  if (!deviceTrees) return null;
  return deviceTrees[category] || null;
}

function getAllTreeCategories(device) {
  const deviceTrees = FAILURE_TREES[device];
  if (!deviceTrees) return [];
  return Object.keys(deviceTrees).map(id => ({
    id,
    label: deviceTrees[id].label,
    icon: deviceTrees[id].icon,
  }));
}

function getTreeSummary(device, category) {
  const tree = getTree(device, category);
  if (!tree) return null;
  const questionCount = Object.keys(tree.questions).length;
  const pathCount = Object.keys(tree.paths).length;
  return {
    id: tree.id,
    label: tree.label,
    icon: tree.icon,
    questionCount,
    pathCount,
    initialQuestion: tree.initialQuestion,
  };
}

function getQuestion(treeId, questionId) {
  for (const deviceTrees of Object.values(FAILURE_TREES)) {
    if (deviceTrees[treeId]) {
      return deviceTrees[treeId].questions[questionId] || null;
    }
    for (const tree of Object.values(deviceTrees)) {
      if (tree.questions[questionId]) {
        return tree.questions[questionId];
      }
    }
  }
  return null;
}

function getAllDevicesWithTrees() {
  return Object.keys(FAILURE_TREES);
}

module.exports = {
  FAILURE_TREES,
  getTree,
  getAllTreeCategories,
  getTreeSummary,
  getQuestion,
  getAllDevicesWithTrees,
};
