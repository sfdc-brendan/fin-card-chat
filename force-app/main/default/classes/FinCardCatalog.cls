/**
 * Brand, site, and starter content for Fin Card Studio. Brand name and site URL come from Fin Agent Settings.
 * An optional sample catalog class (FinCardSeeder in sample-data/stargrid) that implements Callable adds starter
 * cards, site pages, and product images; without it the studio still works and only starter cards are unavailable.
 *
 * Callable actions: seed -> Integer, pages -> List<Map<String, String>> ({slug, title, url}), sitePages -> List<String>,
 * productImage {name} -> String, site -> String, brandName -> String, brandDescription -> String.
 */
public with sharing class FinCardCatalog {
    public static final String DEFAULT_BRAND = 'our company';

    public class CatalogException extends Exception {
    }

    @TestVisible
    private static String providerName = 'FinCardSeeder';

    @TestVisible
    private static Callable providerOverride;

    private static Callable provider() {
        if (providerOverride != null) {
            return providerOverride;
        }
        Type t = Type.forName(providerName);
        if (t == null) {
            return null;
        }
        Object instance = t.newInstance();
        return instance instanceof Callable ? (Callable) instance : null;
    }

    private static Object call(String action, Map<String, Object> args) {
        Callable p = provider();
        return p == null ? null : p.call(action, args == null ? new Map<String, Object>() : args);
    }

    public static Boolean hasStarterCards() {
        return provider() != null;
    }

    public static Integer seed() {
        if (!hasStarterCards()) {
            throw new CatalogException('No starter card set is installed. Deploy sample-data/stargrid, or create cards in the studio.');
        }
        return (Integer) call('seed', null);
    }

    /** Site base URL without a trailing slash, or null when none is configured. */
    public static String site() {
        String configured = Fin_Agent_Settings__c.getOrgDefaults()?.Site_Base_URL__c;
        String url = String.isNotBlank(configured) ? configured.trim() : (String) call('site', null);
        return String.isBlank(url) ? null : url.removeEnd('/');
    }

    public static String brandName() {
        String configured = Fin_Agent_Settings__c.getOrgDefaults()?.Brand_Name__c;
        if (String.isNotBlank(configured)) {
            return configured.trim();
        }
        String sample = (String) call('brandName', null);
        return String.isBlank(sample) ? DEFAULT_BRAND : sample;
    }

    public static String brandDescription() {
        return (String) call('brandDescription', null);
    }

    public static List<Map<String, String>> pages() {
        Object pages = call('pages', null);
        return pages == null ? new List<Map<String, String>>() : (List<Map<String, String>>) pages;
    }

    public static List<String> sitePages() {
        Object pages = call('sitePages', null);
        return pages == null ? new List<String>() : (List<String>) pages;
    }

    public static String productImage(String productName) {
        return (String) call('productImage', new Map<String, Object>{ 'name' => productName });
    }
}
