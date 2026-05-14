/**
 * BuildFormFields - React island component for structured build data fields
 * Provides collapsible sections for all the specialized build metadata fields
 */

import React, { useState, useCallback, useEffect } from "react";
import type {
  WiringData,
  CodebaseData,
  Models3dData,
  PhotosData,
  VideosData,
  BillOfMaterialsData,
  CircuitBoardsData,
  InspirationsData,
  PowerDetailsData,
  ConnectivityData,
  DisplayInfoData,
  EnclosureDetailsData,
} from "@/db/schema";

export interface BuildDataInput {
  difficulty?: string;
  computePlatform?: string;
  estimatedCost?: number;
  buildTime?: string;
  tags?: string[];
  wiring?: WiringData;
  codebase?: CodebaseData;
  models3d?: Models3dData;
  photos?: PhotosData;
  videos?: VideosData;
  tiktokLinks?: string[];
  billOfMaterials?: BillOfMaterialsData;
  circuitBoards?: CircuitBoardsData;
  inspirations?: InspirationsData;
  powerDetails?: PowerDetailsData;
  connectivity?: ConnectivityData;
  displayInfo?: DisplayInfoData;
  enclosure?: EnclosureDetailsData;
}

interface BuildFormFieldsProps {
  initialData?: BuildDataInput;
  onChange?: (data: Record<string, unknown>) => void;
}

// Section toggle component
function SectionToggle({
  title,
  icon,
  isOpen,
  onClick,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="section-toggle"
      aria-expanded={isOpen}
    >
      <span className="section-icon">{icon}</span>
      <span className="section-title">{title}</span>
      <span className="section-indicator">{isOpen ? "−" : "+"}</span>
    </button>
  );
}

// Accordion section wrapper
function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="accordion-section">
      <SectionToggle
        title={title}
        icon={icon}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && <div className="section-content">{children}</div>}
    </div>
  );
}

// Dynamic list manager for adding/removing items
function DynamicList<T>({
  items,
  onChange,
  renderItem,
  addLabel,
  emptyLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, onUpdate: (item: T) => void, onRemove: () => void) => React.ReactNode;
  addLabel: string;
  emptyLabel: string;
}) {
  const handleUpdate = (index: number, item: T) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="dynamic-list">
      {items.length === 0 ? (
        <p className="empty-label">{emptyLabel}</p>
      ) : (
        <div className="list-items">
          {items.map((item, index) =>
            renderItem(item, index, (updated) => handleUpdate(index, updated), () => handleRemove(index))
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...items, null as unknown as T])}
        className="add-item-btn"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export function BuildFormFields({ initialData, onChange }: BuildFormFieldsProps) {
  // Basic fields
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? "");
  const [computePlatform, setComputePlatform] = useState(initialData?.computePlatform ?? "");
  const [estimatedCost, setEstimatedCost] = useState(initialData?.estimatedCost ?? "");
  const [buildTime, setBuildTime] = useState(initialData?.buildTime ?? "");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") ?? "");

  // Wiring section
  const [wiringDesc, setWiringDesc] = useState(initialData?.wiring?.description ?? "");
  const [wiringImages, setWiringImages] = useState<string[]>(initialData?.wiring?.imageUrls ?? []);

  // Codebase section
  const [codebaseDesc, setCodebaseDesc] = useState(initialData?.codebase?.description ?? "");
  const [codebaseUrl, setCodebaseUrl] = useState(initialData?.codebase?.url ?? "");

  // 3D Models section
  const [models3dDesc, setModels3dDesc] = useState(initialData?.models3d?.description ?? "");
  const [models3dFiles, setModels3dFiles] = useState(initialData?.models3d?.files ?? []);

  // Photos section
  const [photosMain, setPhotosMain] = useState(initialData?.photos?.mainImageUrl ?? "");
  const [photosSteps, setPhotosSteps] = useState<string[]>(initialData?.photos?.buildStepImages ?? []);

  // Videos section
  const [videosMain, setVideosMain] = useState(initialData?.videos?.mainVideoUrl ?? "");
  const [videosDemo, setVideosDemo] = useState(initialData?.videos?.demoVideoUrl ?? "");
  const [videosSteps, setVideosSteps] = useState<string[]>(initialData?.videos?.buildStepVideos ?? []);

  // TikTok section (stored separately, not in inspirations)
  const [tiktoks, setTiktoks] = useState<string[]>(initialData?.tiktokLinks ?? []);

  // Bill of Materials
  const [bomItems, setBomItems] = useState(initialData?.billOfMaterials?.items ?? []);

  // Circuit Boards
  const [circuitDesc, setCircuitDesc] = useState(initialData?.circuitBoards?.description ?? "");
  const [circuitFiles, setCircuitFiles] = useState<string[]>(initialData?.circuitBoards?.fileUrls ?? []);
  const [circuitImages, setCircuitImages] = useState<string[]>(initialData?.circuitBoards?.imageUrls ?? []);

  // Inspirations - internal slugs
  const [inspirationSlugs, setInspirationSlugs] = useState<string[]>(
    initialData?.inspirations?.buildSlugs ?? []
  );

  // Inspirations - external links (TikToks stored separately now)
  const [inspirationLinks, setInspirationLinks] = useState<{ title: string; url: string }[]>(
    initialData?.inspirations?.externalLinks?.filter((l) => !l.url.includes("tiktok.com")) ?? []
  );

  // Power Details
  const [powerBattery, setPowerBattery] = useState(initialData?.powerDetails?.batteryType ?? "");
  const [powerCapacity, setPowerCapacity] = useState(initialData?.powerDetails?.capacity ?? "");
  const [powerRuntime, setPowerRuntime] = useState(initialData?.powerDetails?.estimatedRuntime ?? "");

  // Connectivity
  const [connWifi, setConnWifi] = useState(initialData?.connectivity?.wifi ?? false);
  const [connBluetooth, setConnBluetooth] = useState(initialData?.connectivity?.bluetooth ?? false);
  const [connCellular, setConnCellular] = useState(initialData?.connectivity?.cellular ?? false);
  const [connOther, setConnOther] = useState<string[]>(initialData?.connectivity?.other ?? []);

  // Display Info
  const [displayType, setDisplayType] = useState(initialData?.displayInfo?.type ?? "");
  const [displaySize, setDisplaySize] = useState(initialData?.displayInfo?.size ?? "");
  const [displayResolution, setDisplayResolution] = useState(initialData?.displayInfo?.resolution ?? "");

  // Enclosure
  const [enclosureMaterial, setEnclosureMaterial] = useState(initialData?.enclosure?.material ?? "");
  const [enclosureSource, setEnclosureSource] = useState(initialData?.enclosure?.source ?? "");
  const [enclosureCustom, setEnclosureCustom] = useState(initialData?.enclosure?.customization ?? "");

  // Emit data changes
  const emitChange = useCallback(() => {
    const data: Record<string, unknown> = {};

    // Basic fields
    if (difficulty) data.difficulty = difficulty;
    if (computePlatform) data.computePlatform = computePlatform;
    if (estimatedCost) data.estimatedCost = Math.round(Number(estimatedCost) * 100); // Convert to cents
    if (buildTime) data.buildTime = buildTime;
    if (tags) data.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    // Wiring
    if (wiringDesc || wiringImages.length > 0) {
      data.wiring = { description: wiringDesc, imageUrls: wiringImages.filter(Boolean) };
    }

    // Codebase
    if (codebaseDesc || codebaseUrl) {
      data.codebase = { description: codebaseDesc, url: codebaseUrl };
    }

    // 3D Models
    if (models3dDesc || models3dFiles.length > 0) {
      data.models3d = { description: models3dDesc, files: models3dFiles };
    }

    // Photos
    if (photosMain || photosSteps.length > 0) {
      data.photos = { mainImageUrl: photosMain, buildStepImages: photosSteps.filter(Boolean) };
    }

    // Videos
    if (videosMain || videosDemo || videosSteps.length > 0) {
      data.videos = {
        mainVideoUrl: videosMain,
        demoVideoUrl: videosDemo || undefined,
        buildStepVideos: videosSteps.filter(Boolean),
      };
    }

    // Bill of Materials
    if (bomItems.length > 0 && bomItems.some((item) => item.item)) {
      data.billOfMaterials = { items: bomItems.filter((item) => item.item) };
    }

    // Circuit Boards
    if (circuitDesc || circuitFiles.length > 0 || circuitImages.length > 0) {
      data.circuitBoards = {
        description: circuitDesc,
        fileUrls: circuitFiles.filter(Boolean),
        imageUrls: circuitImages.filter(Boolean),
      };
    }

    // TikTok (stored separately from inspirations)
    if (tiktoks.filter(Boolean).length > 0) {
      data.tiktokLinks = tiktoks.filter(Boolean);
    }

    // Inspirations (slugs and non-TikTok external links)
    const validLinks = inspirationLinks.filter((l) => l.url && l.title);
    if (inspirationSlugs.length > 0 || validLinks.length > 0) {
      data.inspirations = { buildSlugs: inspirationSlugs.filter(Boolean), externalLinks: validLinks };
    }

    // Power Details
    if (powerBattery || powerCapacity || powerRuntime) {
      data.powerDetails = {
        batteryType: powerBattery,
        capacity: powerCapacity,
        estimatedRuntime: powerRuntime,
      };
    }

    // Connectivity
    if (connWifi || connBluetooth || connCellular || connOther.length > 0) {
      data.connectivity = {
        wifi: connWifi,
        bluetooth: connBluetooth,
        cellular: connCellular,
        other: connOther.filter(Boolean),
      };
    }

    // Display Info
    if (displayType || displaySize || displayResolution) {
      data.displayInfo = { type: displayType, size: displaySize, resolution: displayResolution };
    }

    // Enclosure
    if (enclosureMaterial || enclosureSource || enclosureCustom) {
      data.enclosure = { material: enclosureMaterial, source: enclosureSource, customization: enclosureCustom };
    }

    // Write directly to window for Astro script consumption
    // (Astro cannot serialize function props across the server→client boundary,
    // so onChange may be undefined when used with client:load)
    (window as any).__buildStructuredFields = data;
    onChange?.(data);
  }, [
    difficulty, computePlatform, estimatedCost, buildTime, tags,
    wiringDesc, wiringImages, codebaseDesc, codebaseUrl,
    models3dDesc, models3dFiles, photosMain, photosSteps,
    videosMain, videosDemo, videosSteps, bomItems,
    circuitDesc, circuitFiles, circuitImages,
    inspirationSlugs, inspirationLinks, tiktoks,
    powerBattery, powerCapacity, powerRuntime,
    connWifi, connBluetooth, connCellular, connOther,
    displayType, displaySize, displayResolution,
    enclosureMaterial, enclosureSource, enclosureCustom,
    onChange,
  ]);

  // Emit changes on any field change
  useEffect(() => {
    emitChange();
  }, [emitChange]);

  return (
    <div className="build-form-fields">
      {/* Basic Fields Section */}
      <div className="basic-fields">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="difficulty" className="form-label">Difficulty</label>
            <select
              id="difficulty"
              className="form-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">None selected</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="computePlatform" className="form-label">Compute Platform</label>
            <input
              type="text"
              id="computePlatform"
              className="form-input"
              placeholder="e.g., Raspberry Pi 5"
              value={computePlatform}
              onChange={(e) => setComputePlatform(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="estimatedCost" className="form-label">Estimated Cost (USD)</label>
            <input
              type="number"
              id="estimatedCost"
              className="form-input"
              placeholder="Cost in dollars"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="buildTime" className="form-label">Build Time</label>
            <input
              type="text"
              id="buildTime"
              className="form-input"
              placeholder="e.g., 3 months"
              value={buildTime}
              onChange={(e) => setBuildTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags" className="form-label">Tags</label>
          <input
            type="text"
            id="tags"
            className="form-input"
            placeholder="Comma-separated tags (e.g., retro, handheld, GPIO)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <span className="form-hint">Separate tags with commas</span>
        </div>
      </div>

      {/* Collapsible Sections */}
      <AccordionSection title="Wiring" icon="📐">
        <div className="form-group">
          <label htmlFor="wiringDesc" className="form-label">Description</label>
          <textarea
            id="wiringDesc"
            className="form-textarea"
            placeholder="Describe your wiring approach..."
            value={wiringDesc}
            onChange={(e) => setWiringDesc(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Wiring Images</label>
          <DynamicList
            items={wiringImages}
            onChange={setWiringImages}
            addLabel="Add Image URL"
            emptyLabel="No wiring images yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Codebase" icon="💻">
        <div className="form-group">
          <label htmlFor="codebaseDesc" className="form-label">Description</label>
          <textarea
            id="codebaseDesc"
            className="form-textarea"
            placeholder="Describe your software setup..."
            value={codebaseDesc}
            onChange={(e) => setCodebaseDesc(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label htmlFor="codebaseUrl" className="form-label">Repository URL</label>
          <input
            type="url"
            id="codebaseUrl"
            className="form-input"
            placeholder="https://github.com/..."
            value={codebaseUrl}
            onChange={(e) => setCodebaseUrl(e.target.value)}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="3D Models" icon="🖨️">
        <div className="form-group">
          <label htmlFor="models3dDesc" className="form-label">Description</label>
          <textarea
            id="models3dDesc"
            className="form-textarea"
            placeholder="Describe your 3D models..."
            value={models3dDesc}
            onChange={(e) => setModels3dDesc(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Model Files</label>
          <DynamicList
            items={models3dFiles}
            onChange={setModels3dFiles}
            addLabel="Add Model File"
            emptyLabel="No 3D model files yet"
            renderItem={(file, index, onUpdate, onRemove) => (
              <div key={index} className="model-file-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="File name"
                  value={file.name}
                  onChange={(e) => onUpdate({ ...file, name: e.target.value })}
                />
                <input
                  type="url"
                  className="form-input"
                  placeholder="File URL"
                  value={file.url}
                  onChange={(e) => onUpdate({ ...file, url: e.target.value })}
                />
                <input
                  type="url"
                  className="form-input"
                  placeholder="Preview image URL (optional)"
                  value={file.imageUrl ?? ""}
                  onChange={(e) => onUpdate({ ...file, imageUrl: e.target.value })}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Photos" icon="📸">
        <div className="form-group">
          <label htmlFor="photosMain" className="form-label">Main Image URL</label>
          <input
            type="url"
            id="photosMain"
            className="form-input"
            placeholder="https://..."
            value={photosMain}
            onChange={(e) => setPhotosMain(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Build Step Images</label>
          <DynamicList
            items={photosSteps}
            onChange={setPhotosSteps}
            addLabel="Add Step Image"
            emptyLabel="No build step images yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Videos" icon="🎥">
        <div className="form-group">
          <label htmlFor="videosMain" className="form-label">Main Video URL</label>
          <input
            type="url"
            id="videosMain"
            className="form-input"
            placeholder="https://youtube.com/..."
            value={videosMain}
            onChange={(e) => setVideosMain(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="videosDemo" className="form-label">Demo Video URL (optional)</label>
          <input
            type="url"
            id="videosDemo"
            className="form-input"
            placeholder="https://youtube.com/..."
            value={videosDemo}
            onChange={(e) => setVideosDemo(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Build Step Videos</label>
          <DynamicList
            items={videosSteps}
            onChange={setVideosSteps}
            addLabel="Add Step Video"
            emptyLabel="No build step videos yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://youtube.com/..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="TikTok" icon="🎵">
        <div className="form-group">
          <label className="form-label">TikTok URLs</label>
          <DynamicList
            items={tiktoks}
            onChange={setTiktoks}
            addLabel="Add TikTok"
            emptyLabel="No TikTok links yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://tiktok.com/@user/video/..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Bill of Materials" icon="🛒">
        <div className="form-group">
          <label className="form-label">Items</label>
          <DynamicList
            items={bomItems}
            onChange={setBomItems}
            addLabel="Add Item"
            emptyLabel="No items yet"
            renderItem={(item, index, onUpdate, onRemove) => (
              <div key={index} className="bom-item-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Item name"
                  value={item.item}
                  onChange={(e) => onUpdate({ ...item, item: e.target.value })}
                />
                <input
                  type="url"
                  className="form-input"
                  placeholder="Link URL (optional)"
                  value={item.link ?? ""}
                  onChange={(e) => onUpdate({ ...item, link: e.target.value })}
                />
                <input
                  type="number"
                  className="form-input cost-input"
                  placeholder="Est. cost (optional)"
                  min="0"
                  step="0.01"
                  value={item.estimatedCost ?? ""}
                  onChange={(e) => onUpdate({ ...item, estimatedCost: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Notes (optional)"
                  value={item.notes ?? ""}
                  onChange={(e) => onUpdate({ ...item, notes: e.target.value })}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Circuit Boards" icon="🔌">
        <div className="form-group">
          <label htmlFor="circuitDesc" className="form-label">Description</label>
          <textarea
            id="circuitDesc"
            className="form-textarea"
            placeholder="Describe your custom circuit boards..."
            value={circuitDesc}
            onChange={(e) => setCircuitDesc(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Design Files</label>
          <DynamicList
            items={circuitFiles}
            onChange={setCircuitFiles}
            addLabel="Add File URL"
            emptyLabel="No design files yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Board Images</label>
          <DynamicList
            items={circuitImages}
            onChange={setCircuitImages}
            addLabel="Add Image URL"
            emptyLabel="No board images yet"
            renderItem={(url, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Inspirations" icon="💡">
        <div className="form-group">
          <label className="form-label">Inspired By (Internal Builds)</label>
          <DynamicList
            items={inspirationSlugs}
            onChange={setInspirationSlugs}
            addLabel="Add Build Slug"
            emptyLabel="No internal inspirations yet"
            renderItem={(slug, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="build-slug"
                  value={slug}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
          <span className="form-hint">Enter the URL slug of other builds (e.g., my-awesome-deck)</span>
        </div>
        <div className="form-group">
          <label className="form-label">External Links</label>
          <DynamicList
            items={inspirationLinks}
            onChange={setInspirationLinks}
            addLabel="Add Link"
            emptyLabel="No external links yet"
            renderItem={(link, index, onUpdate, onRemove) => (
              <div key={index} className="link-item-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Link title"
                  value={link.title}
                  onChange={(e) => onUpdate({ ...link, title: e.target.value })}
                />
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => onUpdate({ ...link, url: e.target.value })}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Power Details" icon="🔋">
        <div className="form-group">
          <label htmlFor="powerBattery" className="form-label">Battery Type</label>
          <input
            type="text"
            id="powerBattery"
            className="form-input"
            placeholder="e.g., LiPo 3S"
            value={powerBattery}
            onChange={(e) => setPowerBattery(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="powerCapacity" className="form-label">Capacity</label>
          <input
            type="text"
            id="powerCapacity"
            className="form-input"
            placeholder="e.g., 5000mAh"
            value={powerCapacity}
            onChange={(e) => setPowerCapacity(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="powerRuntime" className="form-label">Estimated Runtime</label>
          <input
            type="text"
            id="powerRuntime"
            className="form-input"
            placeholder="e.g., 4-6 hours"
            value={powerRuntime}
            onChange={(e) => setPowerRuntime(e.target.value)}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Connectivity" icon="📡">
        <div className="form-group">
          <label className="form-label">Connection Types</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={connWifi}
                onChange={(e) => setConnWifi(e.target.checked)}
              />
              <span>WiFi</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={connBluetooth}
                onChange={(e) => setConnBluetooth(e.target.checked)}
              />
              <span>Bluetooth</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={connCellular}
                onChange={(e) => setConnCellular(e.target.checked)}
              />
              <span>Cellular</span>
            </label>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Other Connection Types</label>
          <DynamicList
            items={connOther}
            onChange={setConnOther}
            addLabel="Add Type"
            emptyLabel="No other connection types"
            renderItem={(type, index, onUpdate, onRemove) => (
              <div key={index} className="list-item-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., LoRa, Serial"
                  value={type}
                  onChange={(e) => onUpdate(e.target.value)}
                />
                <button type="button" onClick={onRemove} className="remove-btn">×</button>
              </div>
            )}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Display Info" icon="🖥️">
        <div className="form-group">
          <label htmlFor="displayType" className="form-label">Display Type</label>
          <input
            type="text"
            id="displayType"
            className="form-input"
            placeholder="e.g., IPS LCD, OLED"
            value={displayType}
            onChange={(e) => setDisplayType(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="displaySize" className="form-label">Size</label>
          <input
            type="text"
            id="displaySize"
            className="form-input"
            placeholder="e.g., 3.5 inch"
            value={displaySize}
            onChange={(e) => setDisplaySize(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="displayResolution" className="form-label">Resolution</label>
          <input
            type="text"
            id="displayResolution"
            className="form-input"
            placeholder="e.g., 800x480"
            value={displayResolution}
            onChange={(e) => setDisplayResolution(e.target.value)}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Enclosure" icon="📦">
        <div className="form-group">
          <label htmlFor="enclosureMaterial" className="form-label">Material</label>
          <input
            type="text"
            id="enclosureMaterial"
            className="form-input"
            placeholder="e.g., 3D printed PLA, laser-cut acrylic"
            value={enclosureMaterial}
            onChange={(e) => setEnclosureMaterial(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="enclosureSource" className="form-label">Source</label>
          <input
            type="text"
            id="enclosureSource"
            className="form-input"
            placeholder="e.g., Upcycled Nintendo DS case"
            value={enclosureSource}
            onChange={(e) => setEnclosureSource(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="enclosureCustom" className="form-label">Customization</label>
          <textarea
            id="enclosureCustom"
            className="form-textarea"
            placeholder="Describe any modifications or custom work..."
            value={enclosureCustom}
            onChange={(e) => setEnclosureCustom(e.target.value)}
            rows={3}
          />
        </div>
      </AccordionSection>

      <style>{`
        .build-form-fields {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px dashed var(--color-border);
        }

        .basic-fields {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.625rem 0.875rem;
          font-size: 0.9375rem;
          font-family: inherit;
          background: var(--color-bg);
          border: 3px solid var(--color-border);
          border-radius: 4px;
          color: var(--color-text);
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--color-focus);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: var(--color-text-muted);
          opacity: 0.7;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-select {
          cursor: pointer;
        }

        .form-hint {
          display: block;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        /* Accordion Sections */
        .accordion-section {
          margin-bottom: 0.5rem;
          border: 3px solid var(--color-border);
          border-radius: 4px;
          overflow: hidden;
        }

        .section-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: var(--color-surface-alt);
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--color-text);
          text-align: left;
          transition: background-color 0.2s;
        }

        .section-toggle:hover {
          background: var(--color-surface);
        }

        .section-icon {
          font-size: 1.25rem;
        }

        .section-title {
          flex: 1;
        }

        .section-indicator {
          font-size: 1.25rem;
          font-weight: 400;
          color: var(--color-primary);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-content {
          padding: 1rem;
          background: var(--color-surface);
          border-top: 3px solid var(--color-border);
        }

        /* Dynamic Lists */
        .dynamic-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .empty-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          font-style: italic;
          padding: 0.5rem 0;
        }

        .list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .list-item-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .list-item-row .form-input {
          flex: 1;
        }

        .model-file-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 0.5rem;
          align-items: center;
        }

        @media (max-width: 640px) {
          .model-file-row {
            grid-template-columns: 1fr;
          }
        }

        .bom-item-row {
          display: grid;
          grid-template-columns: 1fr 1fr 100px 1fr auto;
          gap: 0.5rem;
          align-items: center;
        }

        @media (max-width: 640px) {
          .bom-item-row {
            grid-template-columns: 1fr;
          }
        }

        .cost-input {
          width: 100px;
        }

        .link-item-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 0.5rem;
          align-items: center;
        }

        @media (max-width: 640px) {
          .link-item-row {
            grid-template-columns: 1fr;
          }
        }

        .remove-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface-alt);
          border: 3px solid var(--color-border);
          border-radius: 4px;
          color: var(--color-danger);
          font-size: 1.25rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .remove-btn:hover {
          background: var(--color-danger);
          color: var(--color-text-inverse);
        }

        .add-item-btn {
          padding: 0.5rem 1rem;
          background: var(--color-surface-alt);
          border: 3px solid var(--color-border);
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .add-item-btn:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-inverse);
        }

        /* Checkbox Group */
        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          color: var(--color-text);
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: var(--color-primary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}