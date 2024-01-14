import { create } from 'zustand';
function createSequencesStore(){
    return create((set) => ({
        sequences: {}, 
        setSequences: (value) => {
            set(state => ({ sequences: { ...state.sequences, ...value } }));
        },
        checkedItems: {}, 
        setCheckedItems: (value) => {
            set(state => ({ checkedItems: { ...state.checkedItems, ...value } }));
        },
        cardsCollapsed: {}, 
        setCardsCollapsed: (value) => {
            set(state => ({ cardsCollapsed: { ...state.cardsCollapsed, ...value } }));
        },
        fetched:{},
        setFetched:(value) => {
            set(state => ({ fetched: { ...state.fetched, ...value } }));
        }
    }));
    }
export const useSequencesStore = createSequencesStore();

export default createSequencesStore;