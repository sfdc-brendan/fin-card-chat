@IsTest
private class FinCardSeederTest {
    // Seeding inserts cards in user mode; card fields are only editable through Fin_Card_Studio_Admin.
    @TestSetup
    static void setup() {
        User me = new User(Id = UserInfo.getUserId());
        System.runAs(me) {
            if ([SELECT COUNT() FROM PermissionSetAssignment WHERE AssigneeId = :me.Id AND PermissionSet.Name = 'Fin_Card_Studio_Admin'] == 0) {
                insert new PermissionSetAssignment(AssigneeId = me.Id, PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'Fin_Card_Studio_Admin'].Id);
            }
        }
    }

    @IsTest
    static void seedsOnceThroughTheStudio() {
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Assert.isTrue(FinCardCatalog.hasStarterCards(), 'The catalog finds the sample seeder by name');
            Integer created = FinCardCatalog.seed();
            Assert.isTrue(created > 5, 'Starter cards are created: ' + created);
            Assert.areEqual(created, [SELECT COUNT() FROM Fin_UI_Card__c WITH SYSTEM_MODE]);
            Assert.areEqual(0, FinCardCatalog.seed(), 'Seeding twice creates nothing new');
        }
    }

    @IsTest
    static void groundsTheGeneratorWithTheStarGridSite() {
        Assert.areEqual(FinCardSeeder.SITE, FinCardCatalog.site());
        Assert.areEqual('StarGrid', FinCardCatalog.brandName());
        Assert.isTrue(FinCardCatalog.brandDescription().contains('fictional'));
        Assert.isTrue(FinCardCatalog.sitePages().contains('/support'));
        Boolean hasGuide = false;
        for (Map<String, String> page : FinCardCatalog.pages()) {
            hasGuide = hasGuide || page.get('slug') == 'troubleshoot-slow-fiber';
        }
        Assert.isTrue(hasGuide, 'Support guides are catalog pages');
    }

    @IsTest
    static void settingsOverrideTheSampleBrand() {
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Brand_Name__c = 'Acme', Site_Base_URL__c = 'https://www.acme.test/');
        Assert.areEqual('Acme', FinCardCatalog.brandName());
        Assert.areEqual('https://www.acme.test', FinCardCatalog.site());
    }

    @IsTest
    static void findsCatalogImagesByProductName() {
        Assert.areEqual(FinCardSeeder.SITE + '/images/products/orbit-pro-640.jpg', FinCardCatalog.productImage('Orbit Pro'));
        Assert.areEqual(FinCardSeeder.SITE + '/images/stargrid-fiber-home-768.jpg', FinCardCatalog.productImage('StarGrid Fiber 5'));
        Assert.isNull(FinCardCatalog.productImage('Some Other Widget'));
        Assert.isNull(new FinCardSeeder().call('unknown', null));
    }
}
