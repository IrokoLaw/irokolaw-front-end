"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  RotateCw,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

// Initialize PDF.js worker
//pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// Update the onError prop type to accept an error message
interface PdfViewerProps {
  pdfUrl: string;
  defaultPageNumber: number;
  onError?: (error?: string) => void;
}

export function PdfViewer({
  pdfUrl,
  defaultPageNumber,
  onError,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | undefined>();
  const [pageNumber, setPageNumber] = useState(defaultPageNumber);
  const [scale, setScale] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultPageNumber >= 1 && defaultPageNumber <= (numPages || 1)) {
      setPageNumber(defaultPageNumber);
    }
  }, [defaultPageNumber, numPages]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight": {
          nextPage();

          break;
        }
        case "ArrowLeft": {
          previousPage();

          break;
        }
        case "+":
        case "=": {
          zoomIn();

          break;
        }
        case "-": {
          zoomOut();

          break;
        }
        default: {
          if (e.key === "f" && e.ctrlKey) {
            e.preventDefault();
            toggleFullscreen();
          }
        }
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageNumber, numPages, scale]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setError(
            "Le chargement du PDF a pris trop de temps. Veuillez réessayer."
          );
        }
      }, 15_000); // 15 seconds timeout

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!pdfUrl || pdfUrl === "") {
      setError("URL du PDF non spécifiée");
      setIsLoading(false);
      if (onError) onError("URL du PDF non spécifiée");
    } else {
      setError(undefined);
      setIsLoading(false);
    }
  }, [pdfUrl, onError]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(undefined);
    setIsLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error("Error loading PDF document:", err);
    const errorMessage = `Impossible de charger le PDF: ${err.message}`;
    setError(errorMessage);
    setIsLoading(false);
    if (onError) onError(errorMessage);
  }

  function changePage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= (numPages || 1)) {
      setPageNumber(pageNum);
    }
  }

  function previousPage() {
    changePage(pageNumber - 1);
  }

  function nextPage() {
    changePage(pageNumber + 1);
  }

  function zoomIn() {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  }

  function zoomOut() {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  }

  function resetZoom() {
    setScale(1);
  }

  function rotate() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current?.requestFullscreen().catch((error_) => {
        console.error(
          `Error attempting to enable fullscreen: ${error_.message}`
        );
      });
      setIsFullscreen(true);
    }
  }

  const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Chargement du document...</p>
    </div>
  );

  const ErrorDisplay = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div>
        <h3 className="text-lg font-medium">Impossible de charger le PDF</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
      <Button
        onClick={() => {
          setIsLoading(true);
          setError(undefined);
          setTimeout(() => setIsLoading(false), 500);
        }}
      >
        Réessayer
      </Button>
    </div>
  );

  const PageSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-[600px] w-full max-w-[450px] lg:max-w-[600px] mx-auto rounded-md" />
      <div className="flex justify-between">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center" ref={containerRef}>
      <div
        className={cn(
          "bg-white rounded-lg shadow-lg p-4 max-w-full overflow-auto transition-all",
          isFullscreen ? "w-full h-full" : ""
        )}
      >
        {isLoading ? (
          <LoadingIndicator />
        ) : error ? (
          <ErrorDisplay />
        ) : (
          <Document
            key={pdfUrl}
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<PageSkeleton />}
            className="flex justify-center"
            error={<ErrorDisplay />}
            noData={
              <div className="text-center p-4">
                Aucune donnée PDF disponible
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<PageSkeleton />}
            />
          </Document>
        )}
      </div>

      {!error && !isLoading && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="text-xs px-2"
            >
              {Math.round(scale * 100)}%
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={rotate}
              aria-label="Rotate page"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousPage}
              disabled={pageNumber <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) =>
                  changePage(Number.parseInt(e.target.value) || 1)
                }
                className="w-16 h-8 text-center"
                aria-label="Page number"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                sur {numPages || "--"}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextPage}
              disabled={pageNumber >= (numPages || 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
