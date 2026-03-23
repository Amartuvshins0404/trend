"use client";

import { Header } from "@/components/header";


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Цаагуур чинь яаж хийсэн вэ 🤔</h1>
          <p className="text-[16px] text-muted-foreground max-w-[500px] mx-auto leading-relaxed">Би жоохон залхуу юмаа тэгээд монголд болж буй мэдээллүүдийг нэгтгээд авахыг бодсооооон юм. 😎</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Author card — top on mobile, right on desktop */}
          <div className="lg:col-span-4 lg:order-2 animate-fade-in-up lg:animate-slide-in-right" style={{ animationDelay: "150ms" }}>
            <div className="bg-card rounded-lg shadow-sm lg:sticky lg:top-[72px] p-5">
              <div className="flex lg:flex-col items-center gap-4 lg:gap-0 lg:text-center lg:mb-4">
                <img src="https://avatars.githubusercontent.com/u/43212232" alt="ByamB4" className="w-14 h-14 lg:w-16 lg:h-16 rounded-full lg:mx-auto lg:mb-3" />
                <div className="flex-1 lg:flex-none">
                  <a href="https://instagram.com/byamb4" target="_blank" rel="noopener noreferrer" className="text-[17px] font-bold text-foreground hover:text-primary transition-colors">
                    ByamB4
                  </a>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Спонсор болоход бэлэн хүн байвал DM-дээрэй 💸</p>
                </div>
                <div className="flex lg:hidden items-center gap-2">
                  <a href="https://instagram.com/byamb4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-border transition-colors text-[12px] text-foreground">
                    📸 Instagram
                  </a>
                  <a href="https://github.com/ByamB4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-border transition-colors text-[12px] text-foreground">
                    💻 GitHub
                  </a>
                </div>
              </div>

              <div className="hidden lg:block space-y-2.5 mb-4">
                <a href="https://instagram.com/byamb4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors">
                  <span className="text-lg">📸</span>
                  <span className="text-[13px] text-foreground">Instagram</span>
                </a>
                <a href="https://github.com/ByamB4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors">
                  <span className="text-lg">💻</span>
                  <span className="text-[13px] text-foreground">GitHub</span>
                </a>
              </div>

            </div>
          </div>

          {/* Content — below on mobile, left on desktop */}
          <div className="lg:col-span-8 lg:order-1 space-y-10">
            {/* FAQ */}
            <section className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <h2 className="text-[18px] font-bold text-foreground mb-4">Асуулт & Хариулт 💬</h2>
              <div className="space-y-2.5">
                <div className="bg-card rounded-lg shadow-sm p-4">
                  <p className="text-[14px] font-semibold text-foreground">Үнэгүй юу?</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Тийм ээ. 100% үнэгүй. Бүх мэдээлэл нээлттэй. Нэвтрэх шаардлагагүй 🆓</p>
                </div>
                <div className="bg-card rounded-lg shadow-sm p-4">
                  <p className="text-[14px] font-semibold text-foreground">Хуучин мэдээлэл хадгалдаг уу?</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Үгүй. 7 хоногоос хуучин бүгд устана 🗑️ Fresh data only 💅</p>
                </div>
                <div className="bg-card rounded-lg shadow-sm p-4">
                  <p className="text-[14px] font-semibold text-foreground">Мэдээлэл хэр шинэчлэгддэг вэ?</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Өдөрт хэд хэдэн удаа шинэчлэгдэнэ. Ойролцоогоор 6 цаг тутамд 🔄</p>
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}
