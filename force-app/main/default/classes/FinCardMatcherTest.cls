@IsTest
private class FinCardMatcherTest {
    @TestSetup
    static void setup() {
        insert as system new List<Fin_UI_Card__c>{
            new Fin_UI_Card__c(
                Name = 'Mesh',
                Type__c = 'Product',
                Title__c = 'Orbit 7',
                Body__c = 'Whole-home Wi-Fi.\n- Wi-Fi 7\n- 2-pack',
                Trigger_Keywords__c = 'mesh\ndead zone',
                Match_On__c = 'Both',
                Priority__c = 50,
                Image_URL__c = 'https://example.com/orbit.jpg',
                Primary_Action_Type__c = 'Open_URL',
                Primary_Action_Label__c = 'View',
                Primary_Action_Value__c = 'https://example.com/orbit',
                Secondary_Action_Type__c = 'Send_Message',
                Secondary_Action_Label__c = 'Is it right for me?'
            ),
            new Fin_UI_Card__c(
                Name = 'Callback',
                Type__c = 'Self_Service',
                Title__c = 'Talk to us',
                Trigger_Keywords__c = 'talk to someone',
                Match_On__c = 'User_Message',
                Priority__c = 90,
                Primary_Action_Type__c = 'Launch_Flow',
                Primary_Action_Label__c = 'Request',
                Primary_Action_Value__c = 'Fin_Request_Callback'
            ),
            new Fin_UI_Card__c(
                Name = 'Lights',
                Type__c = 'Article',
                Title__c = 'Status lights',
                Match_On__c = 'Fin_Reply',
                Source_URL_Contains__c = 'gridedge-status-lights',
                Priority__c = 40,
                Primary_Action_Type__c = 'Open_URL',
                Primary_Action_Label__c = 'Read',
                Primary_Action_Value__c = 'javascript:alert(1)'
            ),
            new Fin_UI_Card__c(Name = 'Inactive', Type__c = 'Offer', Title__c = 'Old', Trigger_Keywords__c = 'mesh', Match_On__c = 'Both', Active__c = false)
        };
    }

    static Fin_UI_Card__c cardNamed(String name) {
        return [
            SELECT Id, Name, Type__c, Card_Size__c, Title__c, Subtitle__c, Body__c, Image_URL__c, Price_Label__c, Badge__c, Product__c, Product__r.Name,
                Primary_Action_Type__c, Primary_Action_Label__c, Primary_Action_Value__c,
                Secondary_Action_Type__c, Secondary_Action_Label__c, Secondary_Action_Value__c
            FROM Fin_UI_Card__c
            WHERE Name = :name
            WITH SYSTEM_MODE
        ];
    }

    @IsTest
    static void matchesKeywordsAsWholeWordsAndPlurals() {
        List<FinCardMatcher.Match> matches = FinCardMatcher.match('Any DEAD ZONES in my house?', '', null, 3, null);
        Assert.areEqual(1, matches.size());
        Assert.areEqual('Mesh', matches[0].card.Name);
        Assert.areEqual('Visitor said "dead zone"', matches[0].reasons[0]);
        Assert.areEqual(0, FinCardMatcher.match('meshing', '', null, 3, null).size(), 'Partial words do not match');
    }

    @IsTest
    static void respectsMatchScope() {
        Assert.areEqual(0, FinCardMatcher.match('', 'You can talk to someone on our team.', null, 3, null).size(), 'User_Message cards ignore Fin text');
        Assert.areEqual('Callback', FinCardMatcher.match('Can I talk to someone?', '', null, 3, null)[0].card.Name);
    }

    @IsTest
    static void matchesCitedSourcesAndRanksByPriority() {
        List<FinCardMatcher.Match> matches = FinCardMatcher.match(
            'I want to talk to someone about a dead zone',
            '<p>See the article.</p>',
            new List<String>{ 'https://kb.example/knowledge/GridEdge-Status-Lights.html' },
            3,
            null
        );
        Assert.areEqual(3, matches.size());
        Assert.areEqual('Callback', matches[0].card.Name);
        Assert.areEqual('Mesh', matches[1].card.Name);
        Assert.areEqual('Lights', matches[2].card.Name);
        Assert.areEqual(2, matches[2].hits);
    }

    @IsTest
    static void honoursExcludeAndMax() {
        Fin_UI_Card__c mesh = [SELECT Id FROM Fin_UI_Card__c WHERE Name = 'Mesh' WITH SYSTEM_MODE];
        Assert.areEqual(0, FinCardMatcher.match('mesh', '', null, 3, new Set<Id>{ mesh.Id }).size());
        Assert.areEqual(1, FinCardMatcher.match('talk to someone about mesh', '', null, 1, null).size());
    }

    @IsTest
    static void readsCardsPerTurnFromSettings() {
        Assert.areEqual(FinCardMatcher.DEFAULT_MAX_CARDS, FinCardMatcher.maxCardsPerTurn());
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Max_Cards_Per_Turn__c = 40);
        Assert.areEqual(FinCardMatcher.CARD_CEILING, FinCardMatcher.maxCardsPerTurn());
        Fin_Agent_Settings__c settings = Fin_Agent_Settings__c.getOrgDefaults();
        settings.Max_Cards_Per_Turn__c = 2;
        update as system settings;
        Assert.areEqual(2, FinCardMatcher.maxCardsPerTurn());
        Assert.areEqual(2, FinCardMatcher.match('talk to someone about a dead zone, see the article', '', null, null, null).size());
    }

    @IsTest
    static void readsCardSizeFromSettings() {
        Assert.areEqual(FinCardMatcher.SIZE_STANDARD, FinCardMatcher.cardSize());
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Card_Size__c = ' Compact ');
        Assert.areEqual(FinCardMatcher.SIZE_COMPACT, FinCardMatcher.cardSize());
        Assert.areEqual(FinCardMatcher.SIZE_STANDARD, FinCardMatcher.normalizeSize('huge'));
    }

    @IsTest
    static void serializesTheV1Schema() {
        Map<String, Object> card = FinCardMatcher.toCard(cardNamed('Mesh'));
        Assert.areEqual(1, card.get('v'));
        Assert.areEqual('product', card.get('type'));
        Assert.areEqual('Whole-home Wi-Fi.', card.get('text'));
        Assert.areEqual(new List<String>{ 'Wi-Fi 7', '2-pack' }, card.get('bullets'));
        List<Map<String, Object>> actions = (List<Map<String, Object>>) card.get('actions');
        Assert.areEqual(2, actions.size());
        Assert.areEqual('send_message', actions[1].get('kind'));
        Assert.areEqual('Is it right for me?', actions[1].get('value'), 'Send Message falls back to the label');
    }

    @IsTest
    static void serializesEachCardsOwnSize() {
        Assert.isNull(FinCardMatcher.toCard(cardNamed('Mesh')).get('size'), 'A card without a size follows the Display setting.');
        Assert.areEqual('compact', FinCardMatcher.toCard(new Fin_UI_Card__c(Title__c = 'x', Type__c = 'Offer', Card_Size__c = 'Compact')).get('size'));
        Assert.areEqual('standard', FinCardMatcher.toCard(new Fin_UI_Card__c(Title__c = 'x', Type__c = 'Offer', Card_Size__c = 'Standard')).get('size'));
    }

    @IsTest
    static void dropsUnsafeUrlsAndBadFlowNames() {
        Assert.areEqual(0, ((List<Object>) FinCardMatcher.toCard(cardNamed('Lights')).get('actions')).size());
        Assert.isNull(FinCardMatcher.safeUrl('//evil.example'));
        Assert.areEqual('/s/help', FinCardMatcher.safeUrl('/s/help'));
        Fin_UI_Card__c flowCard = new Fin_UI_Card__c(Title__c = 'x', Type__c = 'Offer', Primary_Action_Type__c = 'Launch_Flow', Primary_Action_Label__c = 'Go', Primary_Action_Value__c = 'bad name!');
        Map<String, Object> card = FinCardMatcher.toCard(flowCard);
        Assert.areEqual('offer', card.get('type'));
        Assert.areEqual(0, ((List<Object>) card.get('actions')).size());
    }

    @IsTest
    static void cardChangesClearTheCache() {
        Assert.areEqual(3, FinCardMatcher.activeCards().size());
        insert as system new Fin_UI_Card__c(Name = 'New', Type__c = 'Offer', Title__c = 'New', Trigger_Keywords__c = 'deal', Match_On__c = 'Both');
        Assert.areEqual(4, FinCardMatcher.activeCards().size());
    }
}
