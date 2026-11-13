import { gql } from '@salesforce/sdk-data';

export const LIST_CARDS = gql`
  query ListFinCards {
    uiapi {
      query {
        Fin_UI_Card__c(
          first: 200
          orderBy: { Priority__c: { order: DESC }, Name: { order: ASC } }
        ) {
          edges {
            node {
              Id
              Name @optional {
                value
              }
              Type__c @optional {
                value
              }
              Title__c @optional {
                value
              }
              Subtitle__c @optional {
                value
              }
              Body__c @optional {
                value
              }
              Image_URL__c @optional {
                value
              }
              Product__c @optional {
                value
              }
              Product__r @optional {
                Name @optional {
                  value
                }
              }
              Price_Label__c @optional {
                value
              }
              Badge__c @optional {
                value
              }
              Primary_Action_Type__c @optional {
                value
              }
              Primary_Action_Label__c @optional {
                value
              }
              Primary_Action_Value__c @optional {
                value
              }
              Secondary_Action_Type__c @optional {
                value
              }
              Secondary_Action_Label__c @optional {
                value
              }
              Secondary_Action_Value__c @optional {
                value
              }
              Trigger_Keywords__c @optional {
                value
              }
              Match_On__c @optional {
                value
              }
              Source_URL_Contains__c @optional {
                value
              }
              Priority__c @optional {
                value
              }
              Card_Size__c @optional {
                value
              }
              Active__c @optional {
                value
              }
              LastModifiedDate @optional {
                value
                displayValue
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_CARD = gql`
  query GetFinCard($id: ID!) {
    uiapi {
      query {
        Fin_UI_Card__c(
          first: 1
          where: { Id: { eq: $id } }
          orderBy: { Priority__c: { order: DESC }, Name: { order: ASC } }
        ) {
          edges {
            node {
              Id
              Name @optional {
                value
              }
              Type__c @optional {
                value
              }
              Title__c @optional {
                value
              }
              Subtitle__c @optional {
                value
              }
              Body__c @optional {
                value
              }
              Image_URL__c @optional {
                value
              }
              Product__c @optional {
                value
              }
              Product__r @optional {
                Name @optional {
                  value
                }
              }
              Price_Label__c @optional {
                value
              }
              Badge__c @optional {
                value
              }
              Primary_Action_Type__c @optional {
                value
              }
              Primary_Action_Label__c @optional {
                value
              }
              Primary_Action_Value__c @optional {
                value
              }
              Secondary_Action_Type__c @optional {
                value
              }
              Secondary_Action_Label__c @optional {
                value
              }
              Secondary_Action_Value__c @optional {
                value
              }
              Trigger_Keywords__c @optional {
                value
              }
              Match_On__c @optional {
                value
              }
              Source_URL_Contains__c @optional {
                value
              }
              Priority__c @optional {
                value
              }
              Card_Size__c @optional {
                value
              }
              Active__c @optional {
                value
              }
              LastModifiedDate @optional {
                value
                displayValue
              }
            }
          }
        }
      }
    }
  }
`;

export const LIST_PRODUCTS = gql`
  query ListStudioProducts {
    uiapi {
      query {
        Product2(
          first: 200
          where: { IsActive: { eq: true } }
          orderBy: { Name: { order: ASC } }
        ) {
          edges {
            node {
              Id
              Name @optional {
                value
              }
              ProductCode @optional {
                value
              }
              Family @optional {
                value
                displayValue
              }
              Description @optional {
                value
              }
              Image_URL__c @optional {
                value
              }
              PricebookEntries(
                first: 1
                where: {
                  IsActive: { eq: true }
                  Pricebook2: { IsStandard: { eq: true } }
                }
              ) @optional {
                edges {
                  node {
                    UnitPrice @optional {
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_CARD = gql`
  mutation CreateFinCard($input: Fin_UI_Card__cCreateInput!) {
    uiapi(input: { allOrNone: true }) {
      Fin_UI_Card__cCreate(input: $input) {
        Record {
          Id
        }
      }
    }
  }
`;

export const UPDATE_CARD = gql`
  mutation UpdateFinCard($input: Fin_UI_Card__cUpdateInput!) {
    uiapi(input: { allOrNone: true }) {
      Fin_UI_Card__cUpdate(input: $input) {
        Record {
          Id
        }
      }
    }
  }
`;

export const DELETE_CARD = gql`
  mutation DeleteFinCard($id: IdOrRef!) {
    uiapi(input: { allOrNone: true }) {
      Fin_UI_Card__cDelete(input: { Id: $id }) {
        Id
      }
    }
  }
`;
