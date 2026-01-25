'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  userId: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function CandidateOnboarding({ userId }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 3: Profile data
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [location, setLocation] = useState('');
  const [professionalSummary, setProfessionalSummary] = useState('');

  // Step 4: CV Upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploaded, setCvUploaded] = useState(false);

  // Step 5: Career Goals
  const [targetJobTitles, setTargetJobTitles] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [remotePolicy, setRemotePolicy] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    if (currentStep === 6) {
      await completeOnboarding();
    } else {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleCVUpload = async (file: File) => {
    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['pdf', 'doc', 'docx'].includes(fileExt)) {
      alert('Invalid file type. Please upload a PDF, DOC, or DOCX file.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Mark all existing CVs as not current
      await supabase
        .from('base_cvs')
        .update({ is_current: false })
        .eq('user_id', userId);

      // Upload to Supabase Storage
      const fileName = `${userId}-base-cv-${Date.now()}.${fileExt}`;
      const filePath = `base-cvs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      // Save CV record
      const { error: insertError } = await supabase
        .from('base_cvs')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_url: publicUrl,
          file_path: filePath,
          file_type: fileExt || 'pdf',
          is_current: true
        });

      if (insertError) throw insertError;

      setCvFile(file);
      setCvUploaded(true);
    } catch (error) {
      console.error('Error uploading CV:', error);
      alert('Failed to upload CV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Update profile
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          linkedin_profile: linkedinProfile,
          location: location,
          professional_summary: professionalSummary,
          target_job_titles: targetJobTitles,
          experience_level: experienceLevel,
          remote_policy: remotePolicy,
          preferred_location: preferredLocation,
          base_cv_uploaded: cvUploaded,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 6
        })
        .eq('id', userId);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen flex items-center">
      <div className="w-full">
        {/* Progress Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-2">Step {currentStep} of {totalSteps}</p>
          <h1 className="text-2xl font-bold mb-4">
            {currentStep === 1 && 'Welcome to Signatura!'}
            {currentStep === 2 && 'Discover Key Features'}
            {currentStep === 3 && 'Set Up Your Profile'}
            {currentStep === 4 && 'Upload Your Base CV'}
            {currentStep === 5 && 'Career Goals'}
            {currentStep === 6 && "You're All Set!"}
          </h1>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center py-8">
              {/* Orange gradient icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold mb-4">Welcome to Signatura!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your AI-powered career companion to help you land your dream job
              </p>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 text-left">
                <p className="text-sm text-orange-900">
                  Let&apos;s take a quick tour and set up your profile. This will only take 2 minutes.
                </p>
              </div>

              <button
                onClick={handleNext}
                className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 inline-flex items-center gap-2"
              >
                Let&apos;s Go!
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* STEP 2: Key Features */}
          {currentStep === 2 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Powerful Tools at Your Fingertips</h2>

              <div className="space-y-3">
                {/* CV Tailor */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">CV Tailor</h3>
                    <p className="text-sm text-gray-600">
                      AI-powered CV tailoring for each job application with ATS optimization.
                    </p>
                  </div>
                </div>

                {/* Interview Coach */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Interview Coach</h3>
                    <p className="text-sm text-gray-600">
                      Practice with AI mock interviews with real-time feedback.
                    </p>
                  </div>
                </div>

                {/* Compensation & Contract */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Compensation & Contract</h3>
                    <p className="text-sm text-gray-600">
                      Market research, negotiation strategies, and contract review.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 inline-flex items-center gap-2 border-2 border-orange-600"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Profile Setup */}
          {currentStep === 3 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Set Up Your Profile</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Playing WithFire"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    LinkedIn Profile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={linkedinProfile}
                    onChange={(e) => setLinkedinProfile(e.target.value)}
                    placeholder="linkedin.com/in/eligur"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Professional Summary (Optional)
                  </label>
                  <textarea
                    value={professionalSummary}
                    onChange={(e) => setProfessionalSummary(e.target.value)}
                    placeholder="Brief description of your professional background..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!fullName || !linkedinProfile}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Upload CV */}
          {currentStep === 4 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Upload Your Base CV</h2>

              {cvUploaded ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-green-800">
                      CV uploaded successfully! You can proceed to the next step.
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-orange-300 rounded-xl p-8 text-center bg-orange-50">
                    <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{cvFile?.name}</p>
                    <button
                      onClick={() => {
                        setCvFile(null);
                        setCvUploaded(false);
                      }}
                      className="text-sm text-teal-600 hover:underline"
                    >
                      Click to replace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-4">
                    <strong>Drag and drop your CV here</strong> or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCVUpload(file);
                      }
                    }}
                    className="hidden"
                    id="cv-upload"
                  />
                  <label
                    htmlFor="cv-upload"
                    className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 mt-3">Supported formats: PDF, DOC, DOCX (Max 10MB)</p>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!cvUploaded || loading}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {loading ? 'Uploading...' : 'Next'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Career Goals */}
          {currentStep === 5 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-4 text-center">Career Goals & Preferences</h2>
              <p className="text-center text-gray-600 mb-6">
                Help us find opportunities that match your lifestyle and ambitions.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Target Job Titles (Comma separated)
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={targetJobTitles}
                      onChange={(e) => setTargetJobTitles(e.target.value)}
                      placeholder="VP Product"
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select level</option>
                    <option value="entry_level">Entry Level</option>
                    <option value="mid_level">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="executive">Executive</option>
                    <option value="career_change">Career Change</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Remote Policy
                    </label>
                    <select
                      value={remotePolicy}
                      onChange={(e) => setRemotePolicy(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select policy</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Preferred Location
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="text"
                        value={preferredLocation}
                        onChange={(e) => setPreferredLocation(e.target.value)}
                        placeholder="e.g. New York, NY"
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Complete */}
          {currentStep === 6 && (
            <div className="text-center py-8">
              {/* Green gradient icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold mb-4">You&apos;re All Set!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Ready to nail your next job opportunity
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-green-800">
                  We&apos;ve saved your profile and preferences. Your AI assistant is ready to help!
                </p>
              </div>

              <button
                onClick={handleNext}
                disabled={loading}
                className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? 'Setting up...' : 'Get Started'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
