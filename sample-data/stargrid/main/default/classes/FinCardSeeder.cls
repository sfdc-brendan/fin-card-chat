/**
 * Sample starter Fin UI Cards for StarGrid, a fictional technology company, plus its catalog pages and product images.
 * Creates only cards whose names do not exist yet. FinCardCatalog finds this class by name and calls it as Callable.
 */
public with sharing class FinCardSeeder implements Callable {
    public static final String SITE = 'https://stargrid-service-demo-721e32a56364.herokuapp.com';
    public static final String BRAND = 'StarGrid';
    public static final String BRAND_DESCRIPTION =
        'StarGrid is a fictional technology company: fiber internet, home and business networking, compute, storage, connected home, and AI.';
    public static final List<String> SITE_PAGES = new List<String>{
        '/fiber', '/products', '/business', '/ai', '/support', '/portal', '/portal/devices', '/portal/cases', '/portal/new-case'
    };
    private static final String CALLBACK_FLOW = 'Fin_Request_Callback';
    private static final String FIBER_IMAGE = SITE + '/images/stargrid-fiber-home-768.jpg';
    private static final String BUSINESS_IMAGE = SITE + '/images/stargrid-business-hero-768.jpg';
    private static final String AI_IMAGE = SITE + '/images/stargrid-ai-hero-768.jpg';
    private static final String PRODUCTS_IMAGE = SITE + '/images/stargrid-products-hero-768.jpg';

    private class Seed {
        String name;
        String type;
        String product;
        String title;
        String subtitle;
        String body;
        String image;
        String price;
        String badge;
        String keywords;
        String matchOn = 'Both';
        String source;
        String primaryType;
        String primaryLabel;
        String primaryValue;
        String secondaryType;
        String secondaryLabel;
        String secondaryValue;
        Integer priority;

        // Fills the primary action first, then the secondary one.
        Seed action(String type, String label, String value) {
            if (primaryType == null) {
                primaryType = type;
                primaryLabel = label;
                primaryValue = value;
            } else {
                secondaryType = type;
                secondaryLabel = label;
                secondaryValue = value;
            }
            return this;
        }

        Seed open(String label, String path) {
            return action('Open_URL', label, path.startsWith('http') ? path : SITE + path);
        }

        Seed ask(String label, String message) {
            return action('Send_Message', label, message);
        }

        Seed flow(String label, String flowApiName) {
            return action('Launch_Flow', label, flowApiName);
        }
    }

    private static Seed product(String slug, String productName, String subtitle, String price, String badge, String bullets, String keywords) {
        Seed s = new Seed();
        s.name = productName + ' product card';
        s.type = 'Product';
        s.product = productName;
        s.title = productName;
        s.subtitle = subtitle;
        s.body = bullets;
        s.image = SITE + '/images/products/' + slug + '-640.jpg';
        s.price = price;
        s.badge = badge;
        s.keywords = keywords;
        s.source = 'product-' + slug;
        s.priority = 50;
        return s.open('View product', '/products/' + slug)
            .ask('Is it right for me?', 'Is the ' + productName + ' a good fit for my home or business?');
    }

    private static Seed offer(String name, String title, String subtitle, String body, String image, String price, String badge, String keywords, Integer priority) {
        Seed s = new Seed();
        s.name = name;
        s.type = 'Offer';
        s.title = title;
        s.subtitle = subtitle;
        s.body = body;
        s.image = image;
        s.price = price;
        s.badge = badge;
        s.keywords = keywords;
        s.priority = priority;
        return s;
    }

    private static Seed plan(String tier, String subtitle, String body, String price, String badge, String keywords, Integer priority) {
        Seed s = offer('Fiber ' + tier + ' plan offer', 'StarGrid Fiber ' + tier, subtitle, body, FIBER_IMAGE, price, badge, keywords, priority);
        s.product = 'StarGrid Fiber ' + tier;
        s.source = 'plan-fiber-' + tier;
        return s.open('Check availability', '/fiber');
    }

    // Guides show when Fin cites them or the visitor uses their wording, not on Fin's reply text alone.
    private static Seed article(String slug, String title, String category, String body, String keywords, Integer priority) {
        Seed s = new Seed();
        s.name = title + ' guide';
        s.type = 'Article';
        s.title = title;
        s.subtitle = category + ' · StarGrid Help Center';
        s.body = body;
        s.keywords = keywords;
        s.matchOn = 'User_Message';
        s.source = slug;
        s.priority = priority;
        return s.open('Read the guide', '/support/' + slug);
    }

    private static Seed selfService(String name, String title, String subtitle, String body, String keywords, Integer priority) {
        Seed s = new Seed();
        s.name = name;
        s.type = 'Self_Service';
        s.title = title;
        s.subtitle = subtitle;
        s.body = body;
        s.keywords = keywords;
        s.matchOn = 'User_Message';
        s.priority = priority;
        return s;
    }

    private static List<Seed> seeds() {
        List<Seed> seeds = new List<Seed>();
        seeds.addAll(productSeeds());
        seeds.addAll(offerSeeds());
        seeds.addAll(selfServiceSeeds());
        seeds.addAll(articleSeeds());
        return seeds;
    }

    private static List<Seed> productSeeds() {
        return new List<Seed>{
            product('orbit-7', 'Orbit 7', 'A better connection in every room.', '$229 / 2-pack', 'New arrival',
                '- Wi-Fi 7 mesh, up to 4,500 sq ft\n- 2 × 2.5 GbE per node\n- Set up in the MyStarGrid app',
                'orbit 7\nmesh\nwifi coverage\ndead zone\nweak wifi'),
            product('orbit-pro', 'Orbit Pro', 'For homes that do a little more.', '$349 / router', 'Performance pick',
                '- Wi-Fi 7, up to 3,000 sq ft\n- 1 × 10 GbE + 4 × 2.5 GbE\n- Prioritize the devices that matter',
                'orbit pro\ngaming router\nmulti gig router'),
            product('gridedge-500', 'GridEdge 500', 'Small footprint. Big business energy.', '$649 / gateway', 'Business essential',
                '- Dual WAN with uplink failover\n- 8 × GbE + 2 × 2.5 GbE\n- Managed in StarGrid Cloud',
                'gridedge\nbusiness gateway\nfailover\nbranch office'),
            product('gridpoint-6', 'GridPoint 6', 'Give your best ideas room to roam.', '$279 / access point', 'Team favorite',
                '- Wi-Fi 6 for business spaces\n- PoE+ power and data on one cable\n- Seamless roaming',
                'gridpoint\naccess point\noffice wifi\npoe'),
            product('gridcore-mini', 'GridCore Mini', 'Big ideas. Meet your small powerhouse.', 'From $1,299', 'Built for AI',
                '- 16-core compute, up to 96 GB memory\n- Up to 4 TB NVMe\n- Local models with StarGrid Studio',
                'gridcore mini\nworkstation\nlocal ai\nrun models'),
            product('gridcore-r1', 'GridCore R1', 'Your next breakthrough starts here.', 'From $4,999', 'Enterprise',
                '- Dual-socket rack platform\n- Up to 2 TB memory, 8 hot-swap bays\n- Private cloud and AI workloads',
                'gridcore r1\nrack server\nprivate cloud\nai infrastructure'),
            product('gridstore-4', 'GridStore 4', 'Keep your work close. Your team closer.', '$899 / enclosure', 'Made for collaboration',
                '- 4 hot-swap drive bays\n- Snapshots and backup policies\n- Shared team folders',
                'gridstore\nnas\nshared storage\nbackup'),
            product('gridview-hub', 'GridView Hub', 'A little harmony for your home.', '$199 / hub', 'Make yourself at home',
                '- 10-inch touch display\n- Wi-Fi 6 + Matter\n- Personalized home routines',
                'gridview\nsmart home\nmatter\nhome hub')
        };
    }

    private static List<Seed> offerSeeds() {
        Seed fiber2 = offer('Fiber 2 upgrade offer', 'StarGrid Fiber 2', 'More room for everything you love.',
            '- Up to 2 Gbps upload and download\n- Orbit 7 mesh equipment included\n- No annual contract',
            FIBER_IMAGE, '$95 / month', 'Most popular',
            'fiber\nslow internet\nfaster internet\nupgrade my plan\ninternet speed', 60);
        fiber2.product = 'StarGrid Fiber 2';
        fiber2.source = 'plan-fiber-2';
        fiber2.open('Check availability', '/fiber').ask('Compare plans', 'How do Fiber 1, Fiber 2, and Fiber 5 compare?');

        Seed gridcare = offer('GridCare Enterprise coverage offer', 'GridCare Enterprise', 'Around-the-clock support for business-critical sites.',
            '- 24/7 support intake\n- Prioritized handling of critical incidents\n- Response and replacement terms set by your agreement',
            BUSINESS_IMAGE, null, 'For business',
            'gridcare\nsupport plan\n24 7 support\nenterprise support\nsupport coverage\npriority support', 58);
        gridcare.source = 'gridcare-support-plans';

        Seed intelligence = offer('StarGrid Intelligence offer', 'StarGrid Intelligence', 'Nova models and StarGrid Studio in one AI portfolio.',
            '- Nova Lite, Nova, and Nova Reason\n- StarGrid Studio for evaluations and apps\n- Runs alongside GridCore compute',
            AI_IMAGE, null, 'AI portfolio',
            'stargrid intelligence\nnova\nnova lite\nnova reason\nstargrid studio\nai models', 55);
        intelligence.source = 'meet-stargrid-intelligence';

        return new List<Seed>{
            fiber2,
            plan('1', 'For everyday life, at full speed.',
                    '- Up to 1 Gbps upload and download\n- Orbit Wi-Fi equipment included\n- No annual contract',
                    '$65 / month', 'Everyday value',
                    'fiber 1\n1 gig\ngigabit plan\ncheapest plan\nbasic plan\nentry plan', 58)
                .ask('Compare plans', 'How do Fiber 1, Fiber 2, and Fiber 5 compare?'),
            plan('5', 'For the wonderfully bandwidth-hungry.',
                    '- Up to 5 Gbps upload and download\n- Multi-gig home networking\n- Built for creators and power users',
                    '$145 / month', 'Fastest tier',
                    'fiber 5\n5 gig\nmulti gig internet\nfastest plan\nfastest internet\ncontent creator\nupload speed', 62)
                .ask('What else do I need?', 'What equipment do I need to get the most out of Fiber 5?'),
            gridcare.open('Compare coverage', '/support/gridcare-support-plans')
                .ask('Plus or Enterprise?', 'What is the difference between GridCare Plus and GridCare Enterprise?'),
            offer('Branch office starter offer', 'Branch office starter kit', 'A secure gateway and business Wi-Fi, managed from StarGrid Cloud.',
                    '- GridEdge 500 gateway with dual-uplink failover\n- GridPoint 6 access points with PoE+\n- One device inventory in StarGrid Cloud',
                    BUSINESS_IMAGE, '$649 + $279 per AP', 'Business bundle',
                    'new office\nopening an office\nbranch setup\nsmall business network\noffice network\nbusiness wifi', 56)
                .open('Explore business', '/business')
                .flow('Talk to a specialist', CALLBACK_FLOW),
            offer('Connected home starter offer', 'Connected home starter', 'Whole-home Wi-Fi and a hub for your routines.',
                    '- Orbit 7 mesh, up to 4,500 sq ft\n- GridView Hub with Matter\n- Managed together in MyStarGrid',
                    PRODUCTS_IMAGE, '$229 + $199', 'Home bundle',
                    'smart home starter\nsmart home setup\nconnected home\njust moved in\nnew home', 54)
                .open('Shop home tech', '/products')
                .ask('Will my devices work?', 'Will my smart home devices work with GridView Hub?'),
            intelligence.open('Explore AI', '/ai')
                .ask('Which compute do I need?', 'Which GridCore should I use to run AI models locally?')
        };
    }

    private static List<Seed> selfServiceSeeds() {
        return new List<Seed>{
            selfService('Request a callback', 'Talk to a StarGrid specialist', 'We will call you back within one business day.',
                    'Leave your details and a short note. A specialist picks it up from the Salesforce Service Console.',
                    'talk to someone\nspeak to a person\ncall me\ncallback\nhuman\nagent', 90)
                .flow('Request a callback', CALLBACK_FLOW),
            selfService('Urgent escalation', 'Escalate an urgent issue', 'For outages affecting customers or many people at once.',
                    'Share the affected site, how many people are affected, the business impact, and what you have already checked.',
                    'urgent\nescalate\nemergency\ncritical issue\nbusiness critical\nasap', 89)
                .flow('Request a specialist', CALLBACK_FLOW)
                .open('View my cases', '/portal/cases'),
            selfService('Talk to sales', 'Get a quote from a StarGrid specialist', 'For teams, multiple sites, and larger deployments.',
                    'Tell us about your sites, users, and timeline. A specialist calls you back with options.',
                    'quote\npricing for my team\nvolume pricing\ntalk to sales\nsales team\nbulk order\nenterprise pricing', 88)
                .flow('Request a call', CALLBACK_FLOW)
                .open('Explore business', '/business'),
            selfService('Billing help', 'Questions about a charge?', 'A specialist reviews billing questions with your account context.',
                    'Have the date and reference of the item ready. Never share card numbers, banking details, or passwords in chat.',
                    'billing question\ncharged twice\nwrong charge\nmy bill\nmy invoice\nbilling dispute\nrefund\nservice credit', 86)
                .flow('Request a callback', CALLBACK_FLOW)
                .open('Billing guide', '/support/billing-pricing-and-service-credits'),
            selfService('Open a support request', 'Open a support request', 'Send the details once. Follow along in MyStarGrid.',
                    'Describe what happened, when it started, the affected site and serial number, and what you have already tried.',
                    'open a case\ncreate a case\nsubmit a ticket\nopen a ticket\nfile a ticket\nsupport request\nreport an issue', 85)
                .open('Start a request', '/portal/new-case')
                .ask('What should I include?', 'What details should I include in my support request?'),
            selfService('Check case status', 'Check on your support request', 'See the latest status and activity for your cases.',
                    'Your cases live in the MyStarGrid customer workspace, with every update from the support team.',
                    'case status\nmy support case\ntrack my case\nticket status\ncase number\nany update', 84)
                .open('View my cases', '/portal/cases')
                .ask('How do I escalate?', 'My issue is urgent. How do I escalate my case?'),
            selfService('Office outage checklist', 'Office offline? Start here', 'A safe, step-by-step checklist for GridEdge sites.',
                    '- Confirm the scope: one device, one network, or the whole site\n- Check the GridEdge power and uplink lights\n- Restart once if allowed. Never factory reset',
                    'office is down\noffice internet down\noffice offline\nwhole office\nnobody can connect\nbranch is down', 82)
                .ask('Walk me through it', 'Our office lost connectivity. Walk me through the checks.')
                .open('Open a request', '/portal/new-case'),
            selfService('Device replacement request', 'Request a device replacement', 'When troubleshooting points to a hardware issue.',
                    '- Record the model and serial number\n- Note each check you ran and its result\n- Wait for return instructions before shipping',
                    'replace my\nreplacement\nbroken device\ndead device\nhardware failure\nrma\nnot powering on', 80)
                .open('Start a request', '/portal/new-case')
                .ask('Am I covered?', 'Is my device covered for a replacement under warranty?'),
            selfService('View my devices', 'See your StarGrid devices', 'Model, serial number, firmware, and warranty in one place.',
                    'MyStarGrid lists the devices on your account by site, with firmware versions and warranty dates.',
                    'my devices\ndevice list\nserial number\nwarranty date\nwhich devices\nmy equipment', 78)
                .open('Open my devices', '/portal/devices')
                .ask('A device is missing', 'A device is missing from my inventory. What should I do?'),
            selfService('Guided Wi-Fi check', 'Run a guided Wi-Fi check', 'Two minutes, step by step, with Fin.',
                    '- Compare a wired and a wireless device\n- Check router and node placement\n- Note where and when the connection drops',
                    'wifi problem\nwifi issue\nwifi not working\nbad wifi\nwifi is slow\nslow wifi', 76)
                .ask('Start the check', 'Walk me through a Wi-Fi check step by step.')
                .open('Read the guide', '/support/improve-orbit-wifi-coverage'),
            selfService('Check fiber availability', 'Is StarGrid Fiber in your area?', 'Preview the plans offered at your ZIP code.',
                    'Enter a ZIP code to preview offers. A specialist confirms eligibility and installation timing.',
                    'available in my area\navailability\nzip code\nmy address\nserviceable\ncan i get fiber', 74)
                .open('Check my ZIP code', '/fiber')
                .ask('What happens at install?', 'What should I prepare for a StarGrid Fiber installation?'),
            selfService('Browse support guides', 'Browse StarGrid support guides', 'Short guides across fiber, Wi-Fi, business networking, and AI.',
                    'Find step-by-step help by topic, from status lights to backups.',
                    'help center\nknowledge base\nsupport articles\nsupport guides\nhow to guides\ndocumentation', 30)
                .open('Browse guides', '/support')
        };
    }

    private static List<Seed> articleSeeds() {
        Seed statusLights = article('gridedge-status-lights', 'What the GridEdge status lights mean', 'Devices',
            'A quick guide to solid, blinking, amber, and red lights, and what to do for each.',
            'status light\namber light\nred light\nblinking light', 40);
        statusLights.name = 'GridEdge status lights article';
        statusLights.subtitle = 'StarGrid Help Center';
        statusLights.matchOn = 'Both';
        statusLights.primaryValue = SITE + '/knowledge/gridedge-status-lights.html';

        return new List<Seed>{
            statusLights,
            article('fiber-connection-unavailable', 'What to check when fiber internet is unavailable', 'Fiber internet',
                    'Safe checks for a complete loss of connectivity.\n- Compare a second device and a wired connection\n- Check power and visible lights, never the fiber port\n- Note when it started and any recent changes',
                    'internet is down\nno internet\ninternet not working\noutage\nlost connection\ninternet went out', 64)
                .ask('Walk me through it', 'My internet is completely down. What should I check first?'),
            article('troubleshoot-slow-fiber', 'Troubleshoot a slow fiber connection', 'Fiber internet',
                    'Separate service, wired-network, and Wi-Fi causes before changing equipment.\n- Compare a wired device with a nearby wireless one\n- Pause large transfers and record results\n- Above 1 Gbps, every port and cable must keep up',
                    'slow internet\nslow connection\nspeed test\nnot getting my speed\nslower than expected\nlag', 63)
                .ask('Walk me through it', 'My fiber feels slow. Walk me through the checks.'),
            article('storage-warning-and-data-access', 'Respond to a storage warning or missing files', 'Compute & AI',
                    'Preserve evidence and avoid changes that could make recovery harder.\n- Record the exact message, time, and affected users\n- Check for a known-good backup\n- Do not format, initialize, or swap drives at random',
                    'missing files\nstorage warning\ndrive warning\ncan t access files\ndeleted files\ndrive failed', 52)
                .ask('What should I avoid?', 'GridStore shows a storage warning. What should I avoid doing?'),
            article('gridpoint-power-and-poe', 'GridPoint 6 will not power on', 'Business networking',
                    'Check the power path safely before requesting a replacement.\n- Confirm the switch or injector supports PoE+\n- Ask your admin to review the port power budget\n- Record the serial number and cable path',
                    'gridpoint not powering\nwon t power on\naccess point no lights\naccess point dead\npoe budget', 52),
            article('compare-stargrid-fiber-plans', 'Compare StarGrid Fiber 1, Fiber 2, and Fiber 5', 'Fiber internet',
                    '- Fiber 1: up to 1 Gbps for $65 / month\n- Fiber 2: up to 2 Gbps for $95 / month\n- Fiber 5: up to 5 Gbps for $145 / month',
                    'compare plans\nwhich plan\nplan comparison\nfiber plans\ndifference between plans', 48)
                .ask('Help me choose', 'Which fiber plan fits a home of four people who stream and work from home?'),
            article('wifi-disconnects-or-roaming', 'Investigate Wi-Fi disconnects and roaming', 'Home networking',
                    'Tell a client problem apart from a coverage or upstream issue.\n- Note which devices drop, where, and how often\n- Check whether wired devices stay connected\n- Compare another client in the same spot',
                    'wifi keeps dropping\nkeeps disconnecting\ndisconnects\ndrops out\nroaming\nwifi cuts out', 48),
            article('local-ai-workload-compatibility', 'Can GridCore run my AI workload?', 'Compute & AI',
                    'Describe the model, framework, input sizes, memory and accelerator needs, concurrency, and latency goals before choosing a configuration.',
                    'ai workload\nrun my model\nllm\ngpu\nwill it run\nmodel size\ninference', 46)
                .ask('Mini or R1?', 'Should I run my AI workload on a GridCore Mini or a GridCore R1?'),
            article('returns-warranty-and-replacement-boundaries', 'Understand returns, warranty, and replacement decisions', 'Billing & policies',
                    'A product listing or warranty date alone does not approve a return. Support confirms ownership and coverage first.',
                    'return\nreturn policy\nwarranty\nmoney back\nrestocking fee', 46),
            article('restore-office-connectivity', 'Restore connectivity at your office', 'Troubleshooting',
                    'A step-by-step checklist for intermittent connections on GridEdge 500.\n- Confirm whether one device or the whole site is affected\n- Record the power and uplink light states\n- Check the uplink cable and your provider status',
                    'intermittent connection\noffice connection\nuplink light\namber uplink', 45),
            article('improve-orbit-wifi-coverage', 'Get more from your Orbit Wi-Fi', 'Home networking',
                    'Placement and connection checks for Orbit 7 and Orbit Pro.\n- Keep the router open, central, and off the floor\n- Place mesh nodes within reliable range, not in the dead zone\n- Compare wired and wireless results',
                    'wifi signal\nrouter placement\nwhere to put\nnode placement\nweak signal\nbetter coverage', 45),
            article('fiber-installation-and-moving', 'Plan an installation or a move', 'Fiber internet',
                    'Have the full service address, building access details, and a contact who can coordinate access ready.',
                    'moving\nnew address\ninstallation appointment\ninstall date\nrelocating\ntransfer my service', 45),
            article('set-up-orbit-home-network', 'Prepare your Orbit home network', 'Home networking',
                    'A practical setup checklist for Orbit 7 mesh and Orbit Pro.\n- Choose a central spot near the incoming Ethernet\n- Use the designated uplink port\n- Never connect fiber directly to an Ethernet port',
                    'set up orbit\nset up my router\nsetup my router\nnew router\ninstall orbit\nsetting up mesh', 45),
            article('gridedge-dual-uplink-failover', 'Understand GridEdge dual-uplink failover', 'Business networking',
                    'A second uplink only helps when the secondary service and its configuration are healthy. Failover can affect active sessions.',
                    'dual uplink\nsecond uplink\nbackup internet\ndual wan\nfailover test', 45),
            article('guest-and-connected-device-networks', 'Plan a guest and connected-device network', 'Home networking',
                    'Keep visitors and smart-home devices on their own networks, with unique credentials you keep private.',
                    'guest network\nguest wifi\nvisitor wifi\niot network\nsmart device network\nseparate network', 44),
            article('gridstore-backup-and-snapshots', 'Plan GridStore backups and snapshots', 'Compute & AI',
                    'Decide which files matter, who can access them, how often they change, and how fast you need to recover.',
                    'backup plan\nbackup strategy\nsnapshots\nsnapshot schedule\nretention', 44),
            article('gridcore-server-power-and-cooling', 'Prepare a GridCore server environment', 'Compute & AI',
                    'Review rack capacity, clearances, power distribution, grounding, cooling, and network connections with qualified personnel.',
                    'rack space\npower requirements\ncooling\nserver room\nthermal warning\npower draw', 44),
            article('gridview-matter-compatibility', 'Connect compatible devices with GridView Hub', 'Connected living',
                    'Matter branding does not guarantee every feature. Confirm the device model, protocol or bridge, and the function you want.',
                    'matter compatible\nworks with gridview\nsmart lights\nconnect my devices\nthermostat', 44),
            article('get-started-with-stargrid-fiber', 'Get ready for StarGrid Fiber', 'Fiber internet',
                    'Have your service address, preferred equipment location, and the number of people and devices in your home ready.',
                    'new fiber customer\ngetting started with fiber\nprepare for fiber\nfirst time setup', 42),
            article('choose-stargrid-compute', 'Find the right compute for your next idea', 'Compute & AI',
                    '- GridCore Mini: a compact workstation for creative work and local AI\n- GridCore R1: a rack platform for private cloud\n- GridStore 4: four-bay shared storage',
                    'which gridcore\ncompare compute\nworkstation or server\nchoose compute\nmini or r1', 42),
            article('device-firmware-and-maintenance', 'Plan device firmware maintenance', 'Business networking',
                    'Confirm the model, current version, approved release, backup, maintenance window, and rollback plan before updating.',
                    'firmware\nfirmware update\nupdate firmware\nmaintenance window\nrollback plan', 42),
            article('stargrid-cloud-device-inventory', 'Understand your StarGrid Cloud device inventory', 'Cloud & account',
                    'See what the portal shows and how to report a missing or incorrect device.',
                    'device inventory\nmissing device\nwrong serial number\ndevice not showing\nincorrect location', 42),
            article('request-device-replacement', 'Request a device replacement', 'Devices',
                    'Support validates your troubleshooting and warranty eligibility, then confirms delivery and return instructions.',
                    'warranty replacement\nreplacement process', 40),
            article('urgent-escalation-and-case-follow-up', 'Escalate an urgent issue and follow your case', 'Support & cases',
                    'Keep the site, impact, and checks you already ran together so the specialist can continue without repetition.',
                    'follow up\ncase update\nescalation process', 40),
            article('billing-pricing-and-service-credits', 'Questions about pricing, billing, and service credits', 'Billing & policies',
                    'Starting prices may describe a base configuration. Taxes, delivery, installation, and discounts need confirmation.',
                    'pricing\ninstallation fee\ntaxes\npromotion\ndiscount', 38),
            article('prepare-support-request', 'Get the most from your support request', 'Getting started',
                    'Describe what you expected, what happened, when it began, and what you already tried. Never include passwords.',
                    'what should i include\nbefore i contact support\nsupport tips', 35),
            article('choose-your-stargrid-portfolio', 'Find your place in the StarGrid portfolio', 'Getting started',
                    'A guide to fiber, home technology, business networking, compute, and AI.',
                    'what does stargrid sell\nproduct lineup\nwhere do i start\nwhich product\nall products', 32)
        };
    }

    /** StarGrid support guides and product pages ({slug, title, url}) that cards can cite and link to. */
    public static List<Map<String, String>> catalogPages() {
        List<Map<String, String>> pages = new List<Map<String, String>>();
        List<Seed> pageSeeds = new List<Seed>(articleSeeds());
        pageSeeds.addAll(productSeeds());
        for (Seed s : offerSeeds()) {
            if (s.source != null && s.source.startsWith('plan-')) {
                pageSeeds.add(s);
            }
        }
        for (Seed s : pageSeeds) {
            pages.add(new Map<String, String>{ 'slug' => s.source, 'title' => s.title, 'url' => s.primaryValue });
        }
        return pages;
    }

    public Object call(String action, Map<String, Object> args) {
        switch on action {
            when 'seed' {
                return seed();
            }
            when 'pages' {
                return catalogPages();
            }
            when 'sitePages' {
                return SITE_PAGES;
            }
            when 'productImage' {
                return productImage((String) args?.get('name'));
            }
            when 'site' {
                return SITE;
            }
            when 'brandName' {
                return BRAND;
            }
            when 'brandDescription' {
                return BRAND_DESCRIPTION;
            }
            when else {
                return null;
            }
        }
    }

    // The StarGrid site has a photo per catalog product and one shared fiber photo; other products get none.
    public static String productImage(String productName) {
        String lower = productName == null ? '' : productName.toLowerCase();
        if (lower.startsWith('stargrid fiber')) {
            return FIBER_IMAGE;
        }
        String slug = lower.removeStart('stargrid ').replaceAll('[^a-z0-9]+', '-').removeStart('-').removeEnd('-');
        for (Map<String, String> page : catalogPages()) {
            if (page.get('slug') == 'product-' + slug) {
                return SITE + '/images/products/' + slug + '-640.jpg';
            }
        }
        return null;
    }

    public static Integer seed() {
        List<Seed> seeds = seeds();
        Set<String> names = new Set<String>();
        Set<String> productNames = new Set<String>();
        for (Seed s : seeds) {
            names.add(s.name);
            if (s.product != null) {
                productNames.add(s.product);
            }
        }
        Set<String> existing = new Set<String>();
        for (Fin_UI_Card__c card : [SELECT Name FROM Fin_UI_Card__c WHERE Name IN :names WITH USER_MODE]) {
            existing.add(card.Name);
        }
        Map<String, Id> products = new Map<String, Id>();
        for (Product2 p : [SELECT Id, Name FROM Product2 WHERE Name IN :productNames WITH USER_MODE]) {
            products.put(p.Name, p.Id);
        }
        List<Fin_UI_Card__c> cards = new List<Fin_UI_Card__c>();
        for (Seed s : seeds) {
            if (existing.contains(s.name)) {
                continue;
            }
            cards.add(
                new Fin_UI_Card__c(
                    Name = s.name,
                    Type__c = s.type,
                    Product__c = s.product == null ? null : products.get(s.product),
                    Title__c = s.title,
                    Subtitle__c = s.subtitle,
                    Body__c = s.body,
                    Image_URL__c = s.image,
                    Price_Label__c = s.price,
                    Badge__c = s.badge,
                    Trigger_Keywords__c = s.keywords,
                    Match_On__c = s.matchOn,
                    Source_URL_Contains__c = s.source,
                    Primary_Action_Type__c = s.primaryType,
                    Primary_Action_Label__c = s.primaryLabel,
                    Primary_Action_Value__c = s.primaryValue,
                    Secondary_Action_Type__c = s.secondaryType,
                    Secondary_Action_Label__c = s.secondaryLabel,
                    Secondary_Action_Value__c = s.secondaryValue,
                    Priority__c = s.priority,
                    Active__c = true
                )
            );
        }
        if (!cards.isEmpty()) {
            Database.insert(cards, AccessLevel.USER_MODE);
        }
        return cards.size();
    }
}
