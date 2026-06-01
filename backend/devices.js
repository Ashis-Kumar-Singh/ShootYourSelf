// Device definitions: brands, categories, diagnostic questions per device type

const DEVICES = {
  laptop: {
    name: 'PC Laptop',
    icon: '\uD83D\uDCBB',
    brands: [
      { id: 'acer', name: 'Acer' },
      { id: 'asus', name: 'Asus' },
      { id: 'hp', name: 'HP' },
      { id: 'dell', name: 'Dell' },
      { id: 'lenovo', name: 'Lenovo' },
      { id: 'msi', name: 'MSI' },
      { id: 'apple', name: 'Apple MacBook' },
      { id: 'samsung', name: 'Samsung' },
      { id: 'toshiba', name: 'Toshiba' },
      { id: 'sony', name: 'Sony VAIO' },
      { id: 'huawei', name: 'Huawei' },
      { id: 'xiaomi', name: 'Xiaomi' },
      { id: 'lg', name: 'LG' },
      { id: 'razer', name: 'Razer' },
      { id: 'microsoft', name: 'Microsoft Surface' },
    ],
    categories: {
      troubleshooting: {
        label: 'Troubleshooting & Fixes',
        icon: '\uD83D\uDD27',
        query: '{device} {brand} {model} problems fix troubleshooting solution',
        questions: [
          'When did the issue start? (After an update, after a drop, or suddenly?)',
          'Does it happen all the time or only sometimes?',
          'Have you tried any fixes already?',
          'Do you see any error messages or unusual behavior?'
        ]
      },
      ram: {
        label: 'RAM Upgrade',
        icon: '\uD83D\uDCBE',
        query: '{device} {brand} {model} RAM upgrade compatible memory specification',
        questions: [
          'How much RAM does it have currently?',
          'Are you getting memory errors or just want a speed boost?',
          'Do you know if the RAM is soldered or has accessible slots?'
        ]
      },
      ssd: {
        label: 'SSD / HDD Replacement',
        icon: '\uD83D\uDCBD',
        query: '{device} {brand} {model} SSD replacement upgrade storage',
        questions: [
          'What storage size do you have currently?',
          'Is it an HDD or SSD?',
          'Are you running out of space or want faster performance?'
        ]
      },
      network: {
        label: 'Network & WiFi',
        icon: '\uD83D\uDCF6',
        query: '{device} {brand} {model} WiFi network adapter driver issue fix',
        questions: [
          'Is WiFi not connecting at all, or is it slow/unstable?',
          'Does it work on other devices?',
          'Can you see available networks in the list?'
        ]
      },
      battery: {
        label: 'Battery',
        icon: '\uD83D\uDD0B',
        query: '{device} {brand} {model} battery replacement',
        questions: [
          'How old is the device?',
          'Does it charge at all?',
          'Is the battery swelling (bulging case/trackpad)?'
        ]
      },
      drivers: {
        label: 'Drivers & Downloads',
        icon: '\uD83D\uDCE5',
        query: '{device} {brand} {model} drivers download support',
        questions: [
          'What operating system are you using?',
          'Which driver do you need? (Graphics, WiFi, Audio, Chipset?)',
          'Is there a yellow warning in Device Manager?'
        ]
      },
      display: {
        label: 'Display / Screen',
        icon: '\uD83D\uDDA5\uFE0F',
        query: '{device} {brand} {model} screen display replacement repair',
        questions: [
          'Is the screen cracked, flickering, or completely black?',
          'Does an external monitor work fine?',
          'Does moving the lid affect the display?'
        ]
      },
      keyboard: {
        label: 'Keyboard / Touchpad',
        icon: '\u2328\uFE0F',
        query: '{device} {brand} {model} keyboard touchpad repair replacement',
        questions: [
          'Are all keys affected or just specific ones?',
          'Has there been any liquid spill?',
          'Does an external keyboard/mouse work fine?'
        ]
      }
    }
  },

  phone: {
    name: 'Phone',
    icon: '\uD83D\uDCF1',
    brands: [
      { id: 'apple', name: 'Apple iPhone' },
      { id: 'samsung', name: 'Samsung Galaxy' },
      { id: 'google', name: 'Google Pixel' },
      { id: 'oneplus', name: 'OnePlus' },
      { id: 'xiaomi', name: 'Xiaomi' },
      { id: 'oppo', name: 'Oppo' },
      { id: 'vivo', name: 'Vivo' },
      { id: 'huawei', name: 'Huawei' },
      { id: 'sony', name: 'Sony Xperia' },
      { id: 'nokia', name: 'Nokia' },
      { id: 'motorola', name: 'Motorola' },
      { id: 'lg', name: 'LG' },
      { id: 'asus', name: 'Asus ROG Phone' },
      { id: 'nothing', name: 'Nothing' },
    ],
    categories: {
      troubleshooting: {
        label: 'Troubleshooting & Fixes',
        icon: '\uD83D\uDD27',
        query: '{device} {brand} {model} problems fix troubleshooting',
        questions: [
          'When did the issue start?',
          'Does it happen all the time or only sometimes?',
          'Have you tried restarting or factory reset?'
        ]
      },
      screen: {
        label: 'Screen Replacement',
        icon: '\uD83D\uDCF1',
        query: '{device} {brand} {model} screen replacement repair',
        questions: [
          'Is the screen cracked, has dead pixels, or completely black?',
          'Is the digitizer still working (touch responds)?',
          'Does the screen show image with a flashlight?'
        ]
      },
      battery: {
        label: 'Battery Replacement',
        icon: '\uD83D\uDD0B',
        query: '{device} {brand} {model} battery replacement repair',
        questions: [
          'How old is the phone?',
          'Does it charge to full and then drop quickly?',
          'Is the battery swelling (screen pushing up from inside)?'
        ]
      },
      charging: {
        label: 'Charging Port',
        icon: '\uD83D\uDD0C',
        query: '{device} {brand} {model} charging port repair replacement',
        questions: [
          'Does it charge at all with different cables?',
          'Is the charging port loose or damaged?',
          'Does wireless charging work (if supported)?'
        ]
      },
      camera: {
        label: 'Camera Issue',
        icon: '\uD83D\uDCF7',
        query: '{device} {brand} {model} camera repair replacement',
        questions: [
          'Is the camera showing black, blurry, or cracked lens?',
          'Does the front or back camera work?',
          'Does the camera app crash?'
        ]
      },
      audio: {
        label: 'Speaker / Audio',
        icon: '\uD83D\uDD0A',
        query: '{device} {brand} {model} speaker audio repair',
        questions: [
          'Is the sound distorted, crackling, or completely gone?',
          'Does it happen with headphones too?',
          'Have you checked the volume and sound settings?'
        ]
      },
      water: {
        label: 'Water Damage',
        icon: '\uD83D\uDCA7',
        query: '{device} {brand} {model} water damage repair fix',
        questions: [
          'Was the device exposed to fresh water, salt water, or another liquid?',
          'Is it still on? (If so, turn it off immediately)',
          'Have you tried putting it in rice or using a drying agent?'
        ]
      },
      os: {
        label: 'Software / OS Issue',
        icon: '\u2699\uFE0F',
        query: '{device} {brand} {model} software update boot loop fix',
        questions: [
          'Is it stuck in a boot loop or frozen on a logo?',
          'Can you access recovery mode?',
          'Did this start after an update?'
        ]
      }
    }
  },

  tablet: {
    name: 'Tablet',
    icon: '\uD83D\uDCFA',
    brands: [
      { id: 'apple', name: 'Apple iPad' },
      { id: 'samsung', name: 'Samsung Galaxy Tab' },
      { id: 'amazon', name: 'Amazon Fire' },
      { id: 'lenovo', name: 'Lenovo Tab' },
      { id: 'huawei', name: 'Huawei MatePad' },
      { id: 'microsoft', name: 'Microsoft Surface' },
      { id: 'xiaomi', name: 'Xiaomi Pad' },
      { id: 'google', name: 'Google Pixel Tablet' },
      { id: 'asus', name: 'Asus ZenPad' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen all the time?', 'Have you tried any fixes?'] },
      screen: { label: 'Screen Replacement', icon: '\uD83D\uDDA5\uFE0F', query: '{device} {brand} {model} screen replacement repair', questions: ['Is the screen cracked or not responding to touch?', 'Does the display still show image?', 'Is the digitizer damaged?'] },
      battery: { label: 'Battery', icon: '\uD83D\uDD0B', query: '{device} {brand} {model} battery replacement repair', questions: ['How old is the tablet?', 'Does it hold a charge?', 'Is the back case bulging?'] },
      charging: { label: 'Charging Issue', icon: '\uD83D\uDD0C', query: '{device} {brand} {model} charging port repair', questions: ['Does it charge with different cables?', 'Is the port clean?', 'Does it charge slowly?'] },
      os: { label: 'Software Issue', icon: '\u2699\uFE0F', query: '{device} {brand} {model} software update restore', questions: ['Is it stuck or crashing?', 'Can you access recovery mode?', 'Did this start after an update?'] },
    }
  },

  console: {
    name: 'Game Console',
    icon: '\uD83C\uDFAE',
    brands: [
      { id: 'sony', name: 'Sony PlayStation' },
      { id: 'microsoft', name: 'Microsoft Xbox' },
      { id: 'nintendo', name: 'Nintendo Switch' },
      { id: 'valve', name: 'Valve Steam Deck' },
      { id: 'asus', name: 'Asus ROG Ally' },
      { id: 'lenovo', name: 'Lenovo Legion Go' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen in all games or just one?', 'Have you tried any fixes?'] },
      overheating: { label: 'Overheating', icon: '\uD83D\uDD25', query: '{device} {brand} {model} overheating fix repair', questions: ['Does it shut down after a few minutes?', 'Are the fans loud?', 'Is the console well-ventilated?'] },
      hdmi: { label: 'HDMI / No Display', icon: '\uD83D\uDCFA', query: '{device} {brand} {model} HDMI no display fix', questions: ['Does the console power on (lights/fans)?', 'Have you tried different HDMI cables/ports?', 'Does it work on a different TV/monitor?'] },
      controller: { label: 'Controller Issue', icon: '\uD83C\uDFAE', query: '{device} {brand} {model} controller not working fix', questions: ['Does the controller pair at all?', 'Does it charge?', 'Is it drifting or have unresponsive buttons?'] },
      storage: { label: 'Storage Upgrade', icon: '\uD83D\uDCBE', query: '{device} {brand} {model} SSD storage upgrade replacement', questions: ['What storage size do you have?', 'Are you running out of space?', 'Do you know what type of storage it uses?'] },
      power: { label: 'Power Issue', icon: '\u26A1', query: '{device} {brand} {model} power light no boot fix', questions: ['Does any light come on when you press power?', 'Does it make any sound?', 'Have you tried a different power cable?'] },
    }
  },

  desktop: {
    name: 'Desktop PC',
    icon: '\uD83D\uDDA5\uFE0F',
    brands: [
      { id: 'dell', name: 'Dell' },
      { id: 'hp', name: 'HP' },
      { id: 'lenovo', name: 'Lenovo' },
      { id: 'acer', name: 'Acer' },
      { id: 'asus', name: 'Asus' },
      { id: 'apple', name: 'Apple Mac' },
      { id: 'msi', name: 'MSI' },
      { id: 'custom', name: 'Custom Build' },
      { id: 'ibuypower', name: 'iBuyPower' },
      { id: 'corsair', name: 'Corsair' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen under load or idle?', 'Have you tried any fixes?'] },
      power: { label: 'Power / No Boot', icon: '\u26A1', query: '{device} {brand} {model} no power no boot fix', questions: ['Does any light or fan spin when you press power?', 'Do you hear any beeps?', 'Have you checked the power cable and outlet?'] },
      gpu: { label: 'Graphics Card', icon: '\uD83C\uDFAE', query: '{device} {brand} {model} graphics card GPU issue fix', questions: ['Is the screen showing artifacts or no display?', 'Does integrated graphics work?', 'Have you updated the GPU driver?'] },
      ram: { label: 'RAM Upgrade', icon: '\uD83D\uDCBE', query: '{device} {brand} {model} RAM upgrade compatible memory', questions: ['How much RAM do you have?', 'Are you getting blue screens or crashes?', 'Do you know the motherboard specs?'] },
      storage: { label: 'Storage Upgrade', icon: '\uD83D\uDCBD', query: '{device} {brand} {model} SSD HDD upgrade replacement', questions: ['What storage do you have now?', 'Are you running out of space?', 'Do you want faster performance or more capacity?'] },
      cooling: { label: 'Cooling / Fans', icon: '\uD83D\uDD25', query: '{device} {brand} {model} cooling fan replacement repair', questions: ['Are the fans loud or not spinning?', 'Does the PC shut down under load?', 'Have you cleaned the dust recently?'] },
    }
  },

  monitor: {
    name: 'Monitor',
    icon: '\uD83D\uDCF1',
    brands: [
      { id: 'dell', name: 'Dell' },
      { id: 'samsung', name: 'Samsung' },
      { id: 'lg', name: 'LG' },
      { id: 'asus', name: 'Asus' },
      { id: 'acer', name: 'Acer' },
      { id: 'benq', name: 'BenQ' },
      { id: 'hp', name: 'HP' },
      { id: 'viewsonic', name: 'ViewSonic' },
      { id: 'gigabyte', name: 'Gigabyte' },
      { id: 'msi', name: 'MSI' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen with all inputs?', 'Have you tried a different cable?'] },
      display: { label: 'Display / Picture Issue', icon: '\uD83D\uDDA5\uFE0F', query: '{device} {brand} {model} display flickering lines repair', questions: ['Is the screen flickering or have lines?', 'Does it happen at all resolutions?', 'Are there dead pixels?'] },
      power: { label: 'Power / No Signal', icon: '\u26A1', query: '{device} {brand} {model} no power no signal fix', questions: ['Does the power LED turn on?', 'Have you tried different ports/cables?', 'Does it work with a different device?'] },
      ports: { label: 'Ports / Connectivity', icon: '\uD83D\uDD0C', query: '{device} {brand} {model} HDMI DisplayPort USB not working', questions: ['Which port is not working?', 'Have you tried different cables?', 'Does the port look physically damaged?'] },
      calibration: { label: 'Color / Calibration', icon: '\uD83C\uDFA8', query: '{device} {brand} {model} color calibration settings', questions: ['Are colors washed out or incorrect?', 'Have you tried resetting to factory settings?', 'Does it happen on all inputs?'] },
    }
  },

  printer: {
    name: 'Printer',
    icon: '\uD83D\uDDA8\uFE0F',
    brands: [
      { id: 'hp', name: 'HP' },
      { id: 'canon', name: 'Canon' },
      { id: 'epson', name: 'Epson' },
      { id: 'brother', name: 'Brother' },
      { id: 'samsung', name: 'Samsung' },
      { id: 'dell', name: 'Dell' },
      { id: 'xerox', name: 'Xerox' },
      { id: 'kyocera', name: 'Kyocera' },
      { id: 'ricoh', name: 'Ricoh' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does the printer power on?', 'Have you checked for error codes on the display?'] },
      paper: { label: 'Paper Jam', icon: '\uD83D\uDCC4', query: '{device} {brand} {model} paper jam fix clear', questions: ['Where is the paper jammed? (input, output, inside?)', 'Have you checked the rollers for debris?', 'Does it happen with all paper types?'] },
      ink: { label: 'Ink / Toner Issue', icon: '\uD83D\uDDA8\uFE0F', query: '{device} {brand} {model} ink toner replacement problem', questions: ['Is the print faded or missing colors?', 'Have you replaced the cartridge recently?', 'Does the printer recognize the cartridge?'] },
      connectivity: { label: 'Connectivity', icon: '\uD83D\uDCF6', query: '{device} {brand} {model} WiFi USB not connecting fix', questions: ['Is it connected via USB or WiFi?', 'Can other devices see it on the network?', 'Have you tried reinstalling the driver?'] },
      quality: { label: 'Print Quality', icon: '\uD83D\uDDBC\uFE0F', query: '{device} {brand} {model} print quality lines streaks fix', questions: ['Are there lines, streaks, or smudges?', 'Have you run a nozzle cleaning cycle?', 'Does it happen with all colors?'] },
      driver: { label: 'Driver / Software', icon: '\u2699\uFE0F', query: '{device} {brand} {model} driver download software install', questions: ['What operating system are you using?', 'Does the printer appear in Devices & Printers?', 'Have you tried reinstalling the driver?'] },
    }
  },

  smartwatch: {
    name: 'Smartwatch',
    icon: '\u231A',
    brands: [
      { id: 'apple', name: 'Apple Watch' },
      { id: 'samsung', name: 'Samsung Galaxy Watch' },
      { id: 'garmin', name: 'Garmin' },
      { id: 'fitbit', name: 'Fitbit' },
      { id: 'google', name: 'Google Pixel Watch' },
      { id: 'huawei', name: 'Huawei Watch' },
      { id: 'amazfit', name: 'Amazfit' },
      { id: 'fossil', name: 'Fossil' },
      { id: 'withings', name: 'Withings' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen all the time?', 'Have you tried restarting the watch?'] },
      screen: { label: 'Screen / Display', icon: '\uD83D\uDDA5\uFE0F', query: '{device} {brand} {model} screen replacement repair display', questions: ['Is the screen cracked or scratched?', 'Is the display black or flickering?', 'Does touch still work?'] },
      battery: { label: 'Battery', icon: '\uD83D\uDD0B', query: '{device} {brand} {model} battery replacement repair', questions: ['How old is the watch?', 'Does it hold a charge for a full day?', 'Is the back bulging?'] },
      charging: { label: 'Charging Issue', icon: '\uD83D\uDD0C', query: '{device} {brand} {model} not charging fix', questions: ['Does it charge with the original charger?', 'Are the charging contacts clean?', 'Does wireless charging work?'] },
      strap: { label: 'Strap / Band', icon: '\uD83D\uDCAA', query: '{device} {brand} {model} strap replacement band size', questions: ['What strap size does it use?', 'Is the lug broken or the strap worn out?', 'Do you want an official or third-party band?'] },
      software: { label: 'Software Issue', icon: '\u2699\uFE0F', query: '{device} {brand} {model} software update freeze crash', questions: ['Is it frozen or crashing?', 'Did this start after an update?', 'Can you access the settings menu?'] },
    }
  },

  camera: {
    name: 'Camera',
    icon: '\uD83D\uDCF7',
    brands: [
      { id: 'canon', name: 'Canon' },
      { id: 'nikon', name: 'Nikon' },
      { id: 'sony', name: 'Sony Alpha' },
      { id: 'fujifilm', name: 'Fujifilm' },
      { id: 'panasonic', name: 'Panasonic Lumix' },
      { id: 'olympus', name: 'Olympus OM-D' },
      { id: 'gopro', name: 'GoPro' },
      { id: 'insta360', name: 'Insta360' },
      { id: 'dji', name: 'DJI' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen in all modes?', 'Have you tried resetting to factory settings?'] },
      lens: { label: 'Lens Issue', icon: '\uD83D\uDCF7', query: '{device} {brand} {model} lens error repair replacement', questions: ['Is the lens stuck, foggy, or showing error?', 'Does it make unusual sounds?', 'Is there visible damage or dust inside?'] },
      battery: { label: 'Battery / Charger', icon: '\uD83D\uDD0B', query: '{device} {brand} {model} battery charger replacement', questions: ['Does the camera turn on?', 'How many shots does the battery last?', 'Does the charger work?'] },
      memory: { label: 'Memory / Storage', icon: '\uD83D\uDCBE', query: '{device} {brand} {model} memory card error fix', questions: ['Does it show a memory card error?', 'Have you tried formatting the card?', 'What type of memory card does it use?'] },
      sensor: { label: 'Sensor / Image Quality', icon: '\uD83D\uDDBC\uFE0F', query: '{device} {brand} {model} sensor cleaning image quality fix', questions: ['Are there spots in the same position on all images?', 'Is the image blurry or distorted?', 'Have you cleaned the sensor?'] },
      software: { label: 'Firmware / Software', icon: '\u2699\uFE0F', query: '{device} {brand} {model} firmware update software issue', questions: ['What firmware version?', 'Is the camera freezing or crashing?', 'Does the companion app connect?'] },
    }
  },

  router: {
    name: 'Router',
    icon: '\uD83D\uDCE1',
    brands: [
      { id: 'tp-link', name: 'TP-Link' },
      { id: 'netgear', name: 'Netgear' },
      { id: 'asus', name: 'Asus' },
      { id: 'linksys', name: 'Linksys' },
      { id: 'd-link', name: 'D-Link' },
      { id: 'ubiquiti', name: 'Ubiquiti UniFi' },
      { id: 'google', name: 'Google Nest WiFi' },
      { id: 'eero', name: 'Eero' },
      { id: 'mikrotik', name: 'MikroTik' },
      { id: 'tenda', name: 'Tenda' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it affect all devices or just one?', 'Have you tried restarting the router?'] },
      wifi: { label: 'WiFi / Signal', icon: '\uD83D\uDCF6', query: '{device} {brand} {model} WiFi signal weak drop fix', questions: ['Is the WiFi slow, dropping, or not broadcasting?', 'Does it work near the router?', 'How many devices are connected?'] },
      firmware: { label: 'Firmware Update', icon: '\u2699\uFE0F', query: '{device} {brand} {model} firmware update how to', questions: ['What firmware version?', 'Are you updating via the web interface or app?', 'Did the update fail?'] },
      configuration: { label: 'Configuration', icon: '\uD83C\uDF10', query: '{device} {brand} {model} setup configuration guide', questions: ['Can you access the admin panel?', 'Do you need help with port forwarding, VPN, or parental controls?', 'Have you tried resetting to factory defaults?'] },
      power: { label: 'Power Issue', icon: '\u26A1', query: '{device} {brand} {model} no power light fix', questions: ['Does any light turn on?', 'Have you tried a different power adapter?', 'Does it work with a different outlet?'] },
    }
  },

  ereader: {
    name: 'E-Reader',
    icon: '\uD83D\uDCDA',
    brands: [
      { id: 'amazon', name: 'Amazon Kindle' },
      { id: 'kobo', name: 'Kobo' },
      { id: 'pocketbook', name: 'PocketBook' },
      { id: 'nook', name: 'Barnes & Noble Nook' },
      { id: 'onyx', name: 'Onyx Boox' },
    ],
    categories: {
      troubleshooting: { label: 'Troubleshooting & Fixes', icon: '\uD83D\uDD27', query: '{device} {brand} {model} problems fix troubleshooting', questions: ['When did the issue start?', 'Does it happen with all books or just some?', 'Have you tried restarting the device?'] },
      screen: { label: 'Screen / Display', icon: '\uD83D\uDDA5\uFE0F', query: '{device} {brand} {model} screen replacement repair e-ink', questions: ['Is the screen cracked or have dead pixels?', 'Is the screen frozen on an image?', 'Is the backlight uneven or broken?'] },
      battery: { label: 'Battery', icon: '\uD83D\uDD0B', query: '{device} {brand} {model} battery replacement repair', questions: ['How old is the e-reader?', 'Does it hold a charge for weeks?', 'Does it charge at all?'] },
      charging: { label: 'Charging Issue', icon: '\uD83D\uDD0C', query: '{device} {brand} {model} not charging fix', questions: ['Does it charge with different cables?', 'Is the charging port clean?', 'Does the charging light come on?'] },
      software: { label: 'Software Issue', icon: '\u2699\uFE0F', query: '{device} {brand} {model} software update freeze crash', questions: ['Is it frozen or crashing?', 'Did this start after an update?', 'Can you connect to a computer?'] },
      connectivity: { label: 'WiFi / Sync', icon: '\uD83D\uDCF6', query: '{device} {brand} {model} WiFi sync not working', questions: ['Does it connect to WiFi?', 'Are books syncing?', 'Have you tried forgetting and re-adding the network?'] },
    }
  }
};

// Build search query from template
function buildQuery(deviceId, brand, model, categoryId) {
  const device = DEVICES[deviceId];
  if (!device) return (brand + ' ' + model + ' ' + categoryId).trim();
  const cat = device.categories[categoryId];
  if (!cat) return (device.name + ' ' + brand + ' ' + model + ' ' + categoryId).trim();
  return cat.query
    .replace('{device}', device.name)
    .replace('{brand}', brand)
    .replace('{model}', model);
}

module.exports = { DEVICES, buildQuery };
