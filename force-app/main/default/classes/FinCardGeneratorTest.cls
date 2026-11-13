@IsTest
private class FinCardGeneratorTest {
    private class FakeModel implements FinCardGenerator.Model {
        String reply;
        String modelName;
        String systemPrompt;
        String userPrompt;

        FakeModel(String reply) {
            this.reply = reply;
        }

        public String complete(String modelName, String systemPrompt, String userPrompt) {
            this.modelName = modelName;
            this.systemPrompt = systemPrompt;
            this.userPrompt = userPrompt;
            return reply;
        }
    }

    private static final String SITE = 'https://www.acme.test';
    private static final String ROUTER_IMAGE = SITE + '/images/products/test-router-640.jpg';

    private class FakeCatalog implements Callable {
        public Object call(String action, Map<String, Object> args) {
            switch on action {
                when 'site' {
                    return SITE;
                }
                when 'brandName' {
                    return 'Acme';
                }
                when 'pages' {
                    return new List<Map<String, String>>{
                        new Map<String, String>{ 'slug' => 'troubleshoot-slow-router', 'title' => 'Fix a slow router', 'url' => SITE + '/support/troubleshoot-slow-router' }
                    };
                }
                when 'sitePages' {
                    return new List<String>{ '/support' };
                }
                when 'productImage' {
                    return args.get('name') == 'Acme Test Router' ? ROUTER_IMAGE : null;
                }
                when else {
                    return null;
                }
            }
        }
    }

    // Card fields are only readable through Fin_Card_Studio_Admin, and the generator queries in user mode.
    @TestSetup
    static void setup() {
        User me = new User(Id = UserInfo.getUserId());
        System.runAs(me) {
            if ([SELECT COUNT() FROM PermissionSetAssignment WHERE AssigneeId = :me.Id AND PermissionSet.Name = 'Fin_Card_Studio_Admin'] == 0) {
                insert new PermissionSetAssignment(AssigneeId = me.Id, PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'Fin_Card_Studio_Admin'].Id);
            }
        }
        insert as system new Product2(Name = 'Acme Test Router', IsActive = true, Family = 'Home networking');
        insert as system new Fin_UI_Card__c(Name = 'Example', Type__c = 'Product', Title__c = 'Router', Trigger_Keywords__c = 'mesh', Active__c = true);
    }

    private static Product2 product() {
        return [SELECT Id FROM Product2 WHERE Name = 'Acme Test Router' WITH SYSTEM_MODE];
    }

    private static FakeModel useModel(String reply) {
        FinCardCatalog.providerOverride = new FakeCatalog();
        FakeModel fake = new FakeModel(reply);
        FinCardGenerator.model = fake;
        return fake;
    }

    @IsTest
    static void groundsThePromptAndValidatesTheDraft() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Id productId = product().Id;
            FakeModel fake = useModel(
                'Here you go:\n```json\n' +
                JSON.serialize(new Map<String, Object>{
                    'name' => 'Router spring offer',
                    'type' => 'Product',
                    'title' => 'Acme Test Router',
                    'body' => '- Fast\n- Simple',
                    'priceLabel' => '$229 / router',
                    'primary' => new Map<String, Object>{ 'type' => 'Open_URL', 'label' => 'View product', 'value' => '/products/test-router' },
                    'secondary' => new Map<String, Object>{ 'type' => 'Open_URL', 'label' => 'Win a prize', 'value' => 'https://evil.example/phish' },
                    'keywords' => new List<Object>{ 'Gaming Router!', 'gaming router', '', 'low latency' },
                    'matchOn' => 'Sometimes',
                    'sourceUrlContains' => 'PRODUCT-TEST-ROUTER',
                    'priority' => 400,
                    'rationale' => 'Gamers ask about latency.'
                }) +
                '\n```'
            );

            Test.startTest();
            Map<String, Object> result = FinCardGenerator.generate(new Map<String, Object>{ 'brief' => 'A card for gamers', 'productId' => productId });
            Test.stopTest();

            Assert.areEqual(FinCardGenerator.DEFAULT_MODEL, fake.modelName);
            Assert.isTrue(fake.userPrompt.contains('Acme Test Router'), 'Products are in the context');
            Assert.isTrue(fake.userPrompt.contains('troubleshoot-slow-router'), 'Support guides are in the context');
            Assert.isTrue(fake.userPrompt.contains('"brand":"Acme"'), 'The brand is in the context');
            Assert.isTrue(fake.systemPrompt.contains('Never invent prices'));

            Map<String, Object> draft = (Map<String, Object>) result.get('draft');
            Assert.areEqual('Product', draft.get('type'));
            Assert.areEqual(productId, draft.get('productId'), 'The requested product is kept when the model omits it');
            Assert.areEqual('Acme Test Router', draft.get('productName'));
            Assert.areEqual(ROUTER_IMAGE, draft.get('imageUrl'), 'Falls back to the product image');
            Map<String, Object> primary = (Map<String, Object>) draft.get('primary');
            Assert.areEqual(SITE + '/products/test-router', primary.get('value'));
            Assert.isNull(((Map<String, Object>) draft.get('secondary')).get('type'), 'Off-site links are dropped');
            Assert.areEqual(new List<String>{ 'gaming router', 'low latency' }, draft.get('keywords'));
            Assert.areEqual('Both', draft.get('matchOn'));
            Assert.areEqual('product-test-router', draft.get('sourceUrlContains'));
            Assert.areEqual(100, draft.get('priority'));
            Assert.areEqual('Gamers ask about latency.', result.get('rationale'));
        }
    }

    @IsTest
    static void keepsOnlyKnownFlowsAndFillsMessageValues() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            useModel(
                JSON.serialize(new Map<String, Object>{
                    'type' => 'Self_Service',
                    'title' => 'Talk to us',
                    'imageUrl' => SITE + '/images/x.jpg',
                    'priceLabel' => '$1',
                    'primary' => new Map<String, Object>{ 'type' => 'Launch_Flow', 'label' => 'Delete everything', 'value' => 'Danger_Flow' },
                    'secondary' => new Map<String, Object>{ 'type' => 'Send_Message', 'label' => 'Ask Fin', 'value' => '' },
                    'priority' => 'high'
                })
            );
            Map<String, Object> draft = (Map<String, Object>) FinCardGenerator.generate(new Map<String, Object>{ 'brief' => 'callback', 'type' => 'Self_Service' }).get('draft');
            Map<String, Object> primary = (Map<String, Object>) draft.get('primary');
            Assert.areEqual('Send_Message', primary.get('type'), 'An unknown flow is dropped and the next action moves up');
            Assert.areEqual('Ask Fin', primary.get('value'));
            Assert.areEqual('User_Message', draft.get('matchOn'));
            Assert.areEqual('', draft.get('imageUrl'), 'Self-service cards have no media');
            Assert.areEqual('', draft.get('priceLabel'));
            Assert.areEqual(50, draft.get('priority'));
            Assert.areEqual('Talk to us', draft.get('name'), 'Name falls back to the title');
        }
    }

    @IsTest
    static void refinesTheCurrentCard() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            FakeModel fake = useModel('{"type":"Article","title":"Shorter","primary":{"type":"Launch_Flow","label":"Call me","value":"Fin_Request_Callback"}}');
            Map<String, Object> result = FinCardGenerator.generate(
                new Map<String, Object>{ 'current' => new Map<String, Object>{ 'title' => 'A very long title' }, 'instruction' => 'Make it shorter' }
            );
            Assert.isTrue(fake.userPrompt.contains('A very long title'));
            Map<String, Object> draft = (Map<String, Object>) result.get('draft');
            Assert.areEqual('Shorter', draft.get('title'));
            Assert.areEqual('Fin_Request_Callback', ((Map<String, Object>) draft.get('primary')).get('value'));
        }
    }

    @IsTest
    static void explainsBadInput() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            useModel('I cannot help with that.');
            for (Map<String, Object> body : new List<Map<String, Object>>{
                new Map<String, Object>(),
                new Map<String, Object>{ 'current' => new Map<String, Object>(), 'instruction' => '' },
                new Map<String, Object>{ 'brief' => 'anything' }
            }) {
                try {
                    FinCardGenerator.generate(body);
                    Assert.fail('Expected an error for ' + body);
                } catch (FinCardGenerator.GeneratorException e) {
                    Assert.isTrue(e.getMessage().length() > 0);
                }
            }
            try {
                FinCardGenerator.parse('{not json}');
                Assert.fail('Expected a parse error');
            } catch (FinCardGenerator.GeneratorException e) {
                Assert.isTrue(e.getMessage().contains('could not read'));
            }
        }
    }

    @IsTest
    static void restrictsLinksToTheConfiguredSite() {
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Site_Base_URL__c = SITE + '/');
        Assert.areEqual(SITE + '/support', FinCardGenerator.siteUrl('/support'));
        Assert.isNull(FinCardGenerator.siteUrl('//evil.example'));
        Assert.isNull(FinCardGenerator.siteUrl(SITE + '.evil.example/x'));
        Assert.isNull(FinCardGenerator.siteUrl('javascript:alert(1)'));
    }

    @IsTest
    static void blocksAllLinksWithoutASite() {
        FinCardCatalog.providerName = 'No_Such_Catalog';
        Assert.isNull(FinCardCatalog.site());
        Assert.isNull(FinCardGenerator.siteUrl('/support'));
        Assert.isNull(FinCardGenerator.siteUrl('https://www.acme.test/support'));
    }

    @IsTest
    static void readsTheModelFromSettings() {
        Assert.areEqual(FinCardGenerator.DEFAULT_MODEL, FinCardGenerator.modelName());
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Card_Model__c = ' sfdc_ai__DefaultGPT41Mini ');
        Assert.areEqual('sfdc_ai__DefaultGPT41Mini', FinCardGenerator.modelName());
    }

    @IsTest
    static void servesTheGenerateRoute() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            useModel('{"type":"Offer","title":"Spring deal","primary":{"type":"Open_URL","label":"See plans","value":"/fiber"}}');
            RestContext.request = new RestRequest();
            RestContext.response = new RestResponse();
            RestContext.request.requestURI = '/services/apexrest/fincards/generate';
            RestContext.request.requestBody = Blob.valueOf('{"brief":"spring fiber deal","type":"Offer"}');
            FinCardStudioResource.post();
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(RestContext.response.responseBody.toString());
            Assert.areEqual('Spring deal', ((Map<String, Object>) result.get('draft')).get('title'));
        }
    }
}
