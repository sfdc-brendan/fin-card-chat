trigger FinUiCardTrigger on Fin_UI_Card__c(after insert, after update, after delete, after undelete) {
    FinCardMatcher.clearCache();
}
