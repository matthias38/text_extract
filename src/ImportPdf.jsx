import './Content.css';

import React, {
    useState,
    useEffect,
    useRef
} from 'react';

import * as pdfjs from 'pdfjs-dist/build/pdf';
//pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/"+pdfjs.version+"/pdf.worker.min.mjs";


import ReactModal from 'react-modal';

import './Modal.css';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';






import {
    create
} from 'zustand';

import extractText from './extractText';





const useStore = create((set) => ({

    seq:[],
    setSeq:(value) => set({
        seq: value
    }),



    text: '',
    images: [],
    isModalOpen: false,
    crops: [],
    crop: {},
    completedCrops: [],
    activeCropIndex: null,
    currentImageIndex: 0,
    isCroping: false,
    isEditing: false,
    isCropReady: false,
    pxCrop: null,
    startRange: 1,
    endRange: null,
    totalPages: 0,
    pdfBuffer: null,
    textBoxes: [],
    isLoading: false,
    setIsLoading: (value) => set({
        isLoading: value
    }),
    setTextBoxes: (value) => set({
        textBoxes: value
    }),
    setPdfBuffer: (value) => set({
        pdfBuffer: value
    }),
    setTotalPages: (value) => set({
        totalPages: value
    }),
    setStartRange: (value) => set({
        startRange: value
    }),
    setEndRange: (value) => set({
        endRange: value
    }),
    setText: (value) => set({
        text: value
    }),
    setImages: (value) => set({
        images: value
    }),
    setIsModalOpen: (value) => set({
        isModalOpen: value
    }),
    setCrops: (value) => set({
        crops: value
    }),
    setCrop: (value) => set({
        crop: value
    }),
    setCompletedCrops: (value) => set({
        completedCrops: value
    }),
    setActiveCropIndex: (value) => set({
        activeCropIndex: value
    }),
    setCurrentImageIndex: (value) => set({
        currentImageIndex: value
    }),
    setIsCroping: (value) => set({
        isCroping: value
    }),
    setIsCropReady: (value) => set({
        isCropReady: value
    }),
    setIsEditing: (value) => {
        set({
            isEditing: value
        })
    },

    setPxCrop: (value) => set({
        pxCrop: value
    }),

    loadingState:null,

    setLoadingState: (value) => set({

loadingState:value
    })
}));



function cloneArrayBuffer(buffer) {
    const cloned = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(cloned).set(new Uint8Array(buffer));
    return cloned;
}

async function convertPDFToImages(pdfBuffer) {

    const pdf = await pdfjs.getDocument({
        data: pdfBuffer
    }).promise;
    const numPages = pdf.numPages;
    const images = [];

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({
            scale: 3
        });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        images.push(canvas.toDataURL());
    }

    return images;
}

var pxc = {}


function ImportPdf() {






    const imageRef = useRef(null);

    const {
        seq,
        setSeq,
        text,
        setText,
        images,
        setImages,
        isModalOpen,
        setIsModalOpen,
        crops,
        setCrops,
        crop,
        setCrop,
        completedCrops,
        setCompletedCrops,
        activeCropIndex,
        setActiveCropIndex,
        currentImageIndex,
        setCurrentImageIndex,
        isCroping,
        setIsCroping,
        isEditing,
        setIsEditing,
        isCropReady,
        setIsCropReady,
        pxCrop,
        setPxCrop,
        startRange,
        endRange,
        setEndRange,
        setStartRange,
        totalPages
    } = useStore();

    const handleStartRangeChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (value >= 1 && value <= endRange) {
            setStartRange(value);
            setCurrentImageIndex(value - 1);
        }
    };

    const handleEndRangeChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (value >= startRange && value <= images.length) {
            setEndRange(value);
        }
    };

    const goToNextImage = () => {
        if (currentImageIndex < (endRange || images.length) - 1) {
            useStore.getState().setCurrentImageIndex(currentImageIndex + 1);
        }
    };

    const goToPreviousImage = () => {
        if (currentImageIndex > (startRange - 1) && currentImageIndex > 0) {
            useStore.getState().setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    const finalizeCrop = () => {

        const c = useStore.getState().crops;
        const updatedCrops = [...c];
        if (!updatedCrops[useStore.getState().currentImageIndex]) {
            updatedCrops[useStore.getState().currentImageIndex] = [];
        }

        if (!useStore.getState().isEditing) {

            updatedCrops[useStore.getState().currentImageIndex].push(pxc);
            useStore.getState().setCrops(updatedCrops);

        } else {
            updatedCrops[useStore.getState().currentImageIndex][useStore.getState().activeCropIndex] = pxc
            useStore.getState().setCrops(updatedCrops);
        }

        cancelCrop();
    };

    const handleOnCropComplete = (pixelCrop, percentCrop) => {
        if (pixelCrop.width == 0 && pixelCrop.height == 0) {
            cancelCrop();
        } else {

            useStore.getState().setIsCropReady(true);

        }
    };

    const cancelCrop = () => {
        useStore.getState().setIsCroping(false);
        useStore.getState().setIsEditing(false);
        useStore.getState().setIsCropReady(false);
        useStore.getState().setCrop({});

    }

    const deleteCrop = () => {

        const c = useStore.getState().crops;
        const updatedCrops = [...c];

        updatedCrops[currentImageIndex].splice(useStore.getState().activeCropIndex, 1)
        useStore.getState().setCrops(updatedCrops);
        cancelCrop();
    }

    const handleKeyDown = (event) => {
        const currentIsEditing = useStore.getState().isEditing; // Zustand direkt abrufen

        if (event.key === 'Enter' && useStore.getState().isCropReady) {
            // Bestätigen und abschließen
            finalizeCrop();

        }

        if (event.key === 'Escape') {

            if (currentIsEditing || useStore.getState().isCropReady) {

                cancelCrop()

            }

            event.stopPropagation();
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {

            if (currentIsEditing && useStore.getState().isCropReady) {

                deleteCrop()

            }

            event.stopPropagation();
        }
    };

    useEffect(() => {

        window.addEventListener('keydown', (event) => handleKeyDown(event));

        return () => {
            // Cleanup, wenn die Komponente unmounted wird
            window.removeEventListener('keydown', (event) => handleKeyDown(event));
        };
    }, []);

    const handleOnCropStart = () => {
        useStore.getState().setIsCropReady(false);
        useStore.getState().setIsCroping(true);

    };

    const handleRectangleClick = (index) => {
        useStore.getState().setIsEditing(true)
        useStore.getState().setActiveCropIndex(index);
        useStore.getState().setCrop(crops[currentImageIndex][index]);
        useStore.getState().setIsCroping(true); // Hier setzen wir isCroping auf true
        useStore.getState().setIsCropReady(true);
    };

    const deepCopyCrop = (crop) => {
        return JSON.parse(JSON.stringify(crop));
    };

    const copyCropsToAllPages = () => {
        const c = useStore.getState().crops
        const cropsToCopy = c[currentImageIndex];

        c.forEach((x, i) => {
            if (i !== currentImageIndex) {
                c[i] = cropsToCopy.map((x) => {
                    return deepCopyCrop(x)
                })
            }

        });

        useStore.getState().setCrops(c)

    };

    const copyCropsToEveryOtherPage = () => {
        const c = useStore.getState().crops;
        const cropsToCopy = c[currentImageIndex];

        c.forEach((x, i) => {
            // Wenn die aktuelle Seite ungerade ist, kopiere auf alle ungeraden Seiten.
            // Wenn die aktuelle Seite gerade ist, kopiere auf alle geraden Seiten.
            if (i !== currentImageIndex && (currentImageIndex % 2 === i % 2)) {
                c[i] = cropsToCopy.map((x) => {
                    return deepCopyCrop(x)
                });
            }
        });

        useStore.getState().setCrops(c)
    };

    const deleteAllCrops = () => {
        const c = useStore.getState().crops;
        const cropsToCopy = c[currentImageIndex];
        c.forEach((x, i) => {

            c[i] = []

        });

        useStore.getState().setCrops(c)

    }

    const resetState = () => {

        useStore.getState().setCrops([]);
        useStore.getState().setCurrentImageIndex(0);
        useStore.getState().setActiveCropIndex(null);
        useStore.getState().setIsCroping(false);
        useStore.getState().setCrop({})

        useStore.getState().setIsEditing(false);
    }

    const handlePDFFileChange = async (e) => {
        const file = e.target.files[0];


        resetState();

        if (file) {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const ab = cloneArrayBuffer(event.target.result)
                useStore.getState().setPdfBuffer(ab);
                const imagesFromPdf = await convertPDFToImages(event.target.result);
                useStore.getState().setImages(imagesFromPdf);
                useStore.getState().setTotalPages(imagesFromPdf.length);
                useStore.getState().setEndRange(imagesFromPdf.length);
                useStore.getState().setStartRange(1);

                const c = new Array(imagesFromPdf.length);

                c.forEach((x, i) => {

                    c[i] = []
                });

                useStore.getState().setCrops(c)

                // TextBoxes Darstellung:

                useStore.getState().setIsModalOpen(true); // Modal öffnen, nachdem die Bilder geladen wurden

            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = null;
    };




    const addSequences = async (sequences) => {

    setSeq(sequences)
    }






const onButtonExtractText = async () => {

useStore.getState().setIsLoading(true); 
const textBlocks = await extractText(useStore.getState().crops,images,startRange,endRange, (page, crop, totalPagesWithCrops, pageOfTotalPages, totalCropsOfPage)=>{

    useStore.getState().setLoadingState([page,crop,totalPagesWithCrops,pageOfTotalPages,totalCropsOfPage]); 
})

//const res = await generateAbstractsForTextBlocks(textBlocks)


addSequences(textBlocks);
useStore.getState().setIsLoading(false); 
useStore.getState().setIsModalOpen(false);
resetState();

    


}




    return (


        <div className="content-container">
            {useStore.getState().isLoading && useStore.getState().loadingState && (
                <div className="loading-overlay">
                    <div className="loading-indicator">
                        
                        <div>
                        <div>Verarbeitung...</div>

<div>
    
    <span>Seite: 
        
        </span>{useStore.getState().loadingState?useStore.getState().loadingState[3]+" von "+useStore.getState().loadingState[2]:null}
            <div>Seitenzahl im Dokument: {useStore.getState().loadingState[0]}</div>
    
    </div>
<div><span>Crop:</span>{useStore.getState().loadingState?useStore.getState().loadingState[1]+" von "+useStore.getState().loadingState[4]:null}</div>

                        
                        </div>
                        
                        </div>
                </div>
            )}

            <div>
                <div>
                    PDF-Datei importieren:</div>
                <input type="file" accept=".pdf" onChange={handlePDFFileChange} />
                <p></p>
            </div>

            <ReactModal
                isOpen={isModalOpen}
                onRequestClose={() => useStore.getState().setIsModalOpen(false)}
                className="ReactModal__Content"
                shouldCloseOnEsc={false}
                overlayClassName="ReactModal__Overlay"
            >
                <button className="close-button" onClick={() => { useStore.getState().setIsModalOpen(false); resetState() }}>×</button>


                {/* Bildanzeige */}

                <div>
                    <label>
                        Start Range:
                        <input
                            type="number"
                            min="1"
                            max={endRange}
                            value={startRange}
                            onChange={handleStartRangeChange}
                            onKeyDown={(e) => e.preventDefault()}
                            disabled={isCroping}
                        />
                    </label>
                    <label>
                        End Range:
                        <input
                            type="number"
                            min={startRange}
                            max={images.length}
                            value={endRange}
                            onChange={handleEndRangeChange}
                            onKeyDown={(e) => e.preventDefault()}
                            disabled={isCroping}
                        />
                    </label>

                    <button disabled={isCroping} onClick={copyCropsToAllPages}>Crops auf alle Seiten kopieren</button>
                    <button disabled={isCroping} onClick={copyCropsToEveryOtherPage}>Crops auf jede zweite Seite kopieren</button>
                    <button disabled={isCroping} onClick={deleteAllCrops}>Alle Crops löschen</button>

                </div>











                <ReactCrop
                    onDragStart={handleOnCropStart}
                    src={images[currentImageIndex]}
                    crop={crop}


                    onChange={(newCrop, perc) => {

                        pxc = perc; //percentage
                        useStore.getState().setCrop(newCrop);

                    }}
                    onComplete={handleOnCropComplete}
                >





                    <div className='my_wrapper' style={{ position: 'relative', display: 'inline-block' }}>
                        <img ref={imageRef} src={images[currentImageIndex]} alt={`Page ${currentImageIndex + 1}`} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />







                        {crops[currentImageIndex]?.map((crop, index) => (
                            <div
                                key={index}
                                onClick={() => handleRectangleClick(index)}
                                style={{
                                    pointerEvents: 'auto',
                                    position: 'absolute',
                                    border: '2px solid red',
                                    top: `${crop.y}%`,
                                    left: `${crop.x}%`,
                                    width: `${crop.width}%`,
                                    height: `${crop.height}%`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    backgroundColor: 'rgba(255, 0, 0, 0.3)'  // leicht transparenter roter Hintergrund, um den Text besser sichtbar zu machen
                                }}
                            >
                                {index + 1}
                            </div>



                        ))}
                    </div>










                </ReactCrop>



                {/* Vor- und Zurück-Buttons */}
                <div className="button-bar">
                    <button onClick={goToPreviousImage} disabled={currentImageIndex === startRange - 1 || isCroping}>Zurück</button>
                    <span>Seite {currentImageIndex - startRange + 2} von {endRange - startRange + 1}</span>
                    <button onClick={goToNextImage} disabled={currentImageIndex === endRange - 1 || isCroping}>Vor</button>
                    <button onClick={onButtonExtractText}>Text Extrahieren</button>
                </div>
            </ReactModal>





            <div>{seq.map((x)=>{
                
                
                return <p style={{padding:"10px"}}><b>{"Seite: "+(x.page[0]+1)}</b><br></br>{x.text}</p>
                
                
                })}</div>

       










        </div>
    );


}

export default ImportPdf;
