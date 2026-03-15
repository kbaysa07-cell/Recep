import React from 'react';
import { Project, WorkspaceFiles } from '../types';
import { FolderOpen, Download, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

interface ProjectsViewProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectsView({ projects, onOpenProject, onDeleteProject }: ProjectsViewProps) {
  const exportProjectAsZip = async (project: Project) => {
    const zip = new JSZip();
    
    // Helper to add files to zip
    const addFilesToZip = (files: WorkspaceFiles, path: string = "") => {
      for (const [name, node] of Object.entries(files)) {
        const fullPath = path ? `${path}/${name}` : name;
        if (node.type === 'file') {
          zip.file(fullPath, node.content || '');
        } else if (node.children) {
          addFilesToZip(node.children, fullPath);
        }
      }
    };

    addFilesToZip(project.files);
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_projesi.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (projects.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50 dark:bg-[#18191a] transition-colors duration-200">
        <div className="text-center text-gray-500 dark:text-gray-400 mt-12 text-sm transition-colors duration-200">
          Henüz proje yok.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50 dark:bg-[#18191a] flex flex-col gap-3 transition-colors duration-200">
      {[...projects].reverse().map(project => (
        <div key={project.id} className="bg-white dark:bg-[#242526] rounded-xl p-3 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
          <div className="flex justify-between items-center mb-2 border-b border-gray-100 dark:border-gray-800 pb-2 transition-colors duration-200">
            <h3 className="font-semibold text-[15px] m-0 text-gray-900 dark:text-gray-100 flex items-center gap-2 transition-colors duration-200">
              💻 {project.title}
            </h3>
          </div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 transition-colors duration-200">
            📅 Güncellenme: {project.date} | 📦 {(() => {
              let count = 0;
              const countFiles = (files: WorkspaceFiles) => {
                for (const node of Object.values(files)) {
                  if (node.type === 'file') count++;
                  else if (node.children) countFiles(node.children);
                }
              };
              countFiles(project.files);
              return count;
            })()} Dosya
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onOpenProject(project.id)}
              className="flex-1 p-2 border-none rounded-lg font-semibold cursor-pointer flex justify-center items-center text-[12px] gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <FolderOpen className="w-4 h-4" /> Aç
            </button>
            <button
              onClick={() => exportProjectAsZip(project)}
              className="flex-1 p-2 border-none rounded-lg font-semibold cursor-pointer flex justify-center items-center text-[12px] gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Download className="w-4 h-4" /> İndir
            </button>
            <button
              onClick={() => {
                if(window.confirm("Silinsin mi?")) {
                  onDeleteProject(project.id);
                }
              }}
              className="flex-[0.3] p-2 border-none rounded-lg font-semibold cursor-pointer flex justify-center items-center text-[12px] gap-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
