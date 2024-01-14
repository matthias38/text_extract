import { create } from 'zustand';
import { promts } from './promts'
import { createTrackedSelector } from 'react-tracked';
import api from './apiCalls'
import { shallow } from "zustand/shallow";
import { reverse_split_beitrag_sammelwerk } from './CSLConverter'
import { subscribeWithSelector } from 'zustand/middleware'
import { debounce, forEach } from 'lodash'
import { formatAPA } from './APA'
const UPDATE_DB = process.env.REACT_APP_UPDATE_DB === '1'


const swapElements = (arr, pos1, pos2) => {



  const temp = arr[pos1];

  arr[pos1] = arr[pos2];

  arr[pos2] = temp;

  return arr;
};



const useStore = create(subscribeWithSelector((set, get) => ({

  quelltextGroupedLists: null,
  generateQuelltextGroupedLists: (selectedCaseId) => {

    const arr = get().getFilteredQuelltextArray(selectedCaseId)


    const obj = {}
    obj[selectedCaseId] = arr;


    set({ quelltextGroupedLists: { ...get().quelltextGroupedLists, ...obj } })



  }

  ,

  cases: [],
  quelltextIdRemoved: null,
  setCases: (value) => set({ cases: value }),
  selectedProjectId: null,
  selectedCaseId: null,
  activeView: 0,
  selectedQuelltext: null,
  quelltextIsSelected: false,
  selectedTextId: null,
  quelltexte: [],
  quelltexteIndexMap: null,
  sequences: [],
  isContentMode: false,
  texte: [],
  expanded: { projects: true, cases: false, quelltexts: false, texts: false },
  zoomLevel: 1,
  showContentBrowser: true,
  promtSelection: promts,
  selectedPromtIndex: 0,
  sammelwerke: [],
  selectedSammelwerk: null,
  selectedQuelltextItem: null,
  setSelectedQuelltextItem: (value) => set({ selectedQuelltextItem: value }),
  setSelectedSammelwerk: (value) => set({ selectedSammelwerk: value }),
  setSammelwerke: (value) => set({ sammelwerke: value }),
  setSelectedPromtIndex: (value) => set({ selectedPromtIndex: value }),
  setPromtSelection: (value) => set({ promtSelection: value }),
  setShowContentBrowser: (value) => set({ showContentBrowser: value }),
  setZoomLevel: (value) => set({ zoomLevel: value }),
  setExpanded: (value) => set((state) => {
    return {
      expanded: {
        ...state.expanded,
        ...value
      }
    };
  }),
  updateTexte: (value) => {
    set((state) => {

      const updatedTexte = state.texte.map(t => t._id === value._id ? value : t);

      return { texte: updatedTexte };
    });
  },
  setTexte: (value) => set({ texte: value }),
  setIsContentMode: (value) => set({ isContentMode: value }),
  setSequences: (value) => set((state) => {
    // Filtern Sie die Sequence-Objekte aus `value`, die noch nicht in `sequences` vorhanden sind
    const newSequences = value.filter(
      newValueItem => !state.sequences.some(
        stateItem => stateItem._id === newValueItem._id
      )
    );
    // Fügen Sie die neuen Sequence-Objekte zu `sequences` hinzu
    return { sequences: state.sequences.concat(newSequences) };
  }),
  setQuelltexte: (value) =>



    set({ quelltexte: value }


    ),
  setSelectedTextId: (value) => set({ selectedTextId: value }),
  caseIdIsSelected: false,
  setSelectedCaseId: (value) => set({ selectedCaseId: value, caseIdIsSelected: value !== null }),

  setSelectedProjectId: async (projectId) => {

    // initial Load of all the Data

    const data = await api.fechtDataOnProjectSelection(projectId)

    // generate the filtered Lists

    set({ selectedProjectId: projectId, selectedQuelltext: null, selectedCaseId: null, selectedTextId: null, cases: data.cases, quelltexte: data.quelltexte })

    // generate index map from quelltexte!!!!!!!!!!







  },



  setActiveView: (value) => set({ activeView: value }),
  setSelectedQuelltext: (value, index) => {

    

    set({ selectedQuelltext: value !== null ? value._id : value, quelltextIsSelected: value !== null, selectedQuelltextItem: get().updateApa(value)})


  },


  getCombinedBeitragSammelwerk: (quelltext) => {
    const state = get();

    const selectedData = quelltext

    let sammelwerk_data = {}

    if (selectedData.type === "beitrag_sammelwerk" && selectedData.in) {
      sammelwerk_data = state.quelltexte.filter(x => x._id === selectedData.in)[0] || {};
      return reverse_split_beitrag_sammelwerk(selectedData, sammelwerk_data)
    } else {

      return selectedData
    }

  },

  draggedItem: null,
  setDraggedItem: (value) => set({ draggedItem: value }),


  getAllBeitraegeConnected: (quelltext_id) => {
    const state = get();

    return state.quelltexte.filter(x => x.type === "beitrag_sammelwerk" && x.in === quelltext_id)
  },


  changeCaseArrayInQuelltext: async (quelltext, caseId, type) => {


    const id = quelltext._id
    const _quelltext = { ...quelltext }


    switch (type) {
      case "remove":
        _quelltext.caseId = _quelltext.caseId.filter(item => item !== caseId);
        break
      case "empty":
        _quelltext.caseId = []
        break
      case "add":
        _quelltext.caseId.push(caseId)
        break
      case "move":
        _quelltext.caseId = [caseId]
        break

    }










    const updatedQuelltext = await api.updateQuelltext(_quelltext._id, _quelltext)


    const { quelltexte, setQuelltexte } = get();
    const updatedQuelltexte = quelltexte.map(q =>
      q._id === id ? updatedQuelltext.quelltext : q
    );
    setQuelltexte(updatedQuelltexte)

  },

  getFilteredQuelltextArray: (caseId) => {


    switch (caseId) {

      case "alle":
        return get().quelltexte.sort((a, b) => a.titel.localeCompare(b.titel))
      case "ohne":
        return get().quelltexte.filter(x => x.caseId.length === 0).sort((a, b) => a.titel.localeCompare(b.titel))
      default:
        return get().quelltexte.filter(x => x.caseId.some((y) => y === caseId)).sort((a, b) => a.titel.localeCompare(b.titel))
    }

  },

  getFilteredQuelltextArrayByKeyValue: (key, value) => {

    return get().quelltexte.filter(qt => qt[key] === value).sort((a, b) => a.titel.localeCompare(b.titel))

  },


  addCase: async () => {


    let caseItem = { name: "Unbenannter Fall" }

    const response = await api.addCase(caseItem, get().selectedProjectId)


    get().generateQuelltextGroupedLists(response.case._id)
    get().setCases([...get().cases, response.case]);


  },

  deleteCase: async (caseId) => {

    await api.deleteCase(caseId)
    get().setCases(get().cases.filter(c => c._id !== caseId));
    if (caseId === get().selectedCaseId) { get().setSelectedCaseId(null) }

  },

  renameCase: async (caseId, newName) => {
    const caseItem = { name: newName }

    const updatedCase = await api.renameCase(caseId, caseItem)

    const updatedCases = get().cases.map(c =>
      c._id === caseId ? updatedCase.case : c
    );
    get().setCases(updatedCases);
  },


  addQuelltext: async (arr = null) => {
    let ci = get().selectedCaseId;

    if (get().selectedCaseId === "alle" || get().selectedCaseId === "ohne") {
      ci = [];
    }

    let defaultData;
    if (arr) {
      defaultData = arr.map((x) => {
        x["caseId"] = ci;
        return x;
      });
    } else {
      defaultData = {
        titel: "Unbenannter Quelltext",
        caseId: ci,
      };
    }

    const data = await api.addQuelltext(defaultData, get().selectedProjectId);
    set({ quelltexte: [...get().quelltexte, ...data.quelltexts] });

  },

  deleteQuelltext: async (id) => {


    try {
      const res = await api.deleteQuelltext(id);
    }
    catch (err) {

      console.log(err)

    }


    //  const qim = {...get().quelltexteIndexMap}
    // let qt = [...get().quelltexte]
    const qt = (get().quelltexte.filter(c => c._id !== id));

    if (get().quelltexteIndexMap[id] === undefined) {
      alert(id)
      return
    }

    /*
   const idOfLastElement = qt[qt.length-1]._id
    qt = swapElements(qt,get().quelltexteIndexMap[id],qt.length-1)
    qt.pop()
    qim[idOfLastElement] = qim[id]
   delete qim[id]



   
*/
    // jetzt muss ich noch den index in der map löschen
    // und dem vorher an letzter stelle stehenden element, den neuen index



    set({
      quelltexte: qt, quelltextIdRemoved: id
    });
    if (id === get().selectedQuelltext) {
      set({ selectedQuelltext: null, quelltextIsSelected: false });
    }
  },

  renameQuelltext: async (id, newTitle) => {
    const updatedQuelltext = await api.renameQuelltext(id, newTitle);
    const updatedQuelltexte = get().quelltexte.map((q) =>
      q._id === id ? updatedQuelltext.quelltext : q
    );
    set({ quelltexte: updatedQuelltexte });
  },




  updateQuelltext: async (fd) => {




    set({ selectedQuelltextItem: fd });

    get().updateQuelltextAfterDebounced(fd)


  },

  onQuelltexteChange: (nextQuelltexte, prevQuelltexte) => {




    if ((prevQuelltexte === null || prevQuelltexte.length === 0) && (get().quelltexteIndexMap === null || Object.entries(get().quelltexteIndexMap).length === 0)) {

      const indexMap = {}
      nextQuelltexte.forEach(function (c, index) {
        indexMap[c._id] = index

      });
      set({ quelltexteIndexMap: indexMap })

      for (const c of get().cases) {
        get().generateQuelltextGroupedLists(c._id)
      }
      get().generateQuelltextGroupedLists("ohne")
      get().generateQuelltextGroupedLists("alle")


    } else {








      const qim = { ...get().quelltexteIndexMap }

      if (nextQuelltexte.length > prevQuelltexte.length) {



        const newElementCount = nextQuelltexte.length - prevQuelltexte.length

        for (let i = nextQuelltexte.length - newElementCount; i < nextQuelltexte.length; i++) {

          // update Index map

          qim[nextQuelltexte[i]._id] = i;

        }


      } else if (nextQuelltexte.length < prevQuelltexte.length) {


        // nothing--- we did this in the remove quelltext function


      }

      // quelltexte   ["0","1","2"]
      // map         ["0","1","2"]
      // sobald ich ein element aus dem array lösche, verschieben sich die indexe und die zuweisungen in der map stimmen nicht mehr
      // ich muss beim löschen eine neue map erstellen

      set({ quelltexteIndexMap: qim })


    }




    if (prevQuelltexte.length === nextQuelltexte.length) {

      let startTime = performance.now();
      get().cases.forEach(e => {

        get().generateQuelltextGroupedLists(e._id)
      });
      get().generateQuelltextGroupedLists("alle")
      get().generateQuelltextGroupedLists("ohne")
      // After the function has executed
      let endTime = performance.now();

      // Calculate the time difference
      let timeTaken = endTime - startTime;

      console.log(`Time taken: ${timeTaken} milliseconds`);





    } else {

      get().cases.forEach(e => {

        get().generateQuelltextGroupedLists(e._id)
      });
      get().generateQuelltextGroupedLists("alle")
      get().generateQuelltextGroupedLists("ohne")

    }



    console.log(get().quelltexte, get().quelltexteIndexMap)

  },


updateApa:(data = null)=>{

  if (data===null){
  const item = { ...get().selectedQuelltextItem }
  item.apa = formatAPA(get().getCombinedBeitragSammelwerk(item))
  set({selectedQuelltextItem: item })
  }else{

    const item = { ...data }
    item.apa = formatAPA(get().getCombinedBeitragSammelwerk(item))
    return item
  }


},




  updateQuelltextAfterDebounced: debounce((x) => get().updateQuelltextAfter(x), 1000),

  updateQuelltextAfter: (fd) => {

    const { selectedQuelltext, quelltexte, selectedQuelltextItem } = get();

    //  const updatedQuelltexte = quelltexte.map(qt => qt._id === selectedQuelltext ? fd : qt);


    const updatedQuelltexte = [...quelltexte]; // Klonen des Arrays, um Mutationen zu vermeiden
    let found = false;
    for (let i = 0; i < updatedQuelltexte.length; i++) {
      if (updatedQuelltexte[i]._id === selectedQuelltext) {
        updatedQuelltexte[i] = fd; // Nehmen wir an, fd ist das aktualisierte Objekt
        found = true;
        break; // Abbruch der Schleife, da das Element gefunden wurde
      }
    }

   
    get().updateApa()

    set({ quelltexte: updatedQuelltexte })




    try {
      const data = api.updateQuelltext(selectedQuelltext, fd);


    } catch (error) {
      console.error('Fehler beim Aktualisieren der Daten:', error);
    }

  },



})));
const allKeys = Object.keys(useStore.getState())


export const createStoreWithSelectors = (store) => {
  const useStore = (keys = allKeys) => {
    return store((state) => {
      const x = keys.reduce((acc, cur) => {
        acc[cur] = state[cur];
        return acc;
      }, {});
      return x;
    }, shallow);
  };
  return useStore;
}

const unsub2 = useStore.subscribe((state) => state.quelltexte, useStore.getState().onQuelltexteChange)

//const unsubscribe = useStore.subscribe(useStore.getState().onQuelltexteChange, state => state.quelltext)


const useContentStore = createStoreWithSelectors(useStore)

export default useContentStore;



