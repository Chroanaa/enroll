/**
 * ConfirmationModal Usage Examples
 * 
 * This file demonstrates various ways to use the ConfirmationModal component
 * with different variants and configurations.
 */

import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import { AlertTriangle, CheckCircle2, Info, Trash2 } from "lucide-react";

// Example 1: Basic Delete Confirmation (Danger variant)
export const DeleteExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete Item</button>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          // Perform delete action
          console.log("Item deleted");
          setIsOpen(false);
        }}
        message='Are you sure you want to delete this item?'
        description='This action cannot be undone. All associated data will be permanently removed.'
        variant='danger'
        confirmText='Delete'
      />
    </>
  );
};

// Example 2: Custom Delete with Building Name
export const CustomDeleteExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buildingName = "Science Building";

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        // Delete building
        setIsOpen(false);
      }}
      title='Delete Building'
      message={`Are you sure you want to delete "${buildingName}"?`}
      description='This will permanently remove the building and all associated rooms and departments. This action cannot be undone.'
      confirmText='Delete Building'
      cancelText='Keep Building'
      variant='danger'
    />
  );
};

// Example 3: Warning Confirmation
export const WarningExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        // Proceed with action
        setIsOpen(false);
      }}
      title='Unsaved Changes'
      message='You have unsaved changes. Are you sure you want to leave?'
      description='Your changes will be lost if you continue without saving.'
      variant='warning'
      confirmText='Leave Without Saving'
      cancelText='Stay and Save'
    />
  );
};

// Example 4: Info Confirmation
export const InfoExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        // Confirm action
        setIsOpen(false);
      }}
      title='Confirm Action'
      message='Do you want to proceed with this action?'
      variant='info'
    />
  );
};

// Example 5: Success Confirmation
export const SuccessExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        // Confirm success action
        setIsOpen(false);
      }}
      title='Confirm Submission'
      message='Are you ready to submit this form?'
      description='Please review all information before submitting.'
      variant='success'
      confirmText='Submit'
    />
  );
};

// Example 6: Custom Icon
export const CustomIconExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        setIsOpen(false);
      }}
      message='Custom icon example'
      variant='danger'
      icon={<AlertTriangle className='w-6 h-6' />}
    />
  );
};

// Example 7: With Loading State
export const LoadingExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleConfirm}
      message='This action will take a few moments to complete.'
      variant='info'
      isLoading={isLoading}
    />
  );
};

// Example 8: Delete with Item Details
export const DetailedDeleteExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const item = {
    name: "Computer Science Department",
    code: "CS",
    building: "Science Building",
    students: 150,
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={() => {
        // Delete department
        setIsOpen(false);
      }}
      title='Delete Department'
      message={`Are you sure you want to delete "${item.name}" (${item.code})?`}
      description={`This department is located in ${item.building} and has ${item.students} students. Deleting it will affect all associated records.`}
      variant='danger'
      confirmText='Delete Department'
      cancelText='Cancel'
    />
  );
};


