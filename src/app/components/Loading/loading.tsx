"use client"
type LoadingProps = {
  classname?: string;   // optional, because you might sometimes not pass it
};
export default function Loading({classname}:LoadingProps){

    return (
        <div className={`flex items-center justify-center ${classname} md:h-full`}>
        <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
      </div>
    )
}